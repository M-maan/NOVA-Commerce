import { BadRequestException, ConflictException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { CatalogStatus, Prisma, ProductType } from '@prisma/client';
import { createHash } from 'node:crypto';
import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { CatalogQueryDto } from './dto/catalog-query.dto';
import { CreateBrandDto, UpdateBrandDto } from './dto/brand.dto';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';
import { CreateImageDto, UpdateImageDto } from './dto/image.dto';
import { CreateOptionDto, UpdateOptionDto } from './dto/option.dto';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto';
import { CreateVariantDto, UpdateVariantDto } from './dto/variant.dto';

const productInclude = {
  brand: true,
  categories: { include: { category: true } },
  variants: { include: { optionValues: { include: { optionValue: { include: { option: true } } } }, images: true }, orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }] },
  options: { include: { values: { orderBy: { sortOrder: 'asc' } } }, orderBy: { sortOrder: 'asc' } },
  images: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }] },
} satisfies Prisma.ProductInclude;

type PaginateDelegate = {
  count: (args: Record<string, unknown>) => Promise<number>;
  findMany: (args: Record<string, unknown>) => Promise<unknown[]>;
};

type ProductWithPublicRelations = Prisma.ProductGetPayload<{
  include: typeof productInclude;
}>;

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService, private readonly redis: RedisService) {}

  async uploadImage(productId: string, file: { buffer: Buffer; mimetype: string }, body: { altText?: string; sortOrder?: string; variantId?: string }) {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    const canSignUpload = Boolean(apiKey && apiSecret);
    if (!cloudName || (!uploadPreset && !canSignUpload)) {
      throw new InternalServerErrorException('Media upload is not configured. Set a Cloudinary upload preset or API credentials.');
    }

    const form = new FormData();
    form.append('file', new Blob([new Uint8Array(file.buffer)], { type: file.mimetype }), 'catalog-image');
    if (canSignUpload) {
      const folder = process.env.CLOUDINARY_FOLDER?.trim() || 'nova-commerce/products';
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const signature = createHash('sha1')
        .update(`folder=${folder}&timestamp=${timestamp}${apiSecret}`)
        .digest('hex');
      form.append('api_key', apiKey as string);
      form.append('folder', folder);
      form.append('timestamp', timestamp);
      form.append('signature', signature);
    } else {
      form.append('upload_preset', uploadPreset as string);
    }
    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: 'POST', body: form });
    const payload = (await response.json()) as { secure_url?: string; public_id?: string; error?: { message?: string } };
    if (!response.ok || !payload.secure_url || !payload.public_id) throw new BadRequestException(payload.error?.message ?? 'Media upload failed');
    return this.createImage(productId, { imageUrl: payload.secure_url, publicId: payload.public_id, altText: body.altText, sortOrder: body.sortOrder ? Number(body.sortOrder) : undefined, variantId: body.variantId });
  }

  async createCategory(dto: CreateCategoryDto) {
    await this.assertUniqueCategorySlug(dto.slug);
    if (dto.parentId) await this.assertCategory(dto.parentId);
    return this.prisma.category.create({ data: dto });
  }

  listAdminCategories(query: CatalogQueryDto) {
    return this.paginate(this.prisma.category as unknown as PaginateDelegate, this.categoryWhere(query), query, [{ sortOrder: 'asc' }, { createdAt: 'desc' }], {
      parent: true,
      children: true,
    });
  }

  async getAdminCategory(id: string) {
    const category = await this.prisma.category.findUnique({ where: { id }, include: { parent: true, children: true } });
    if (!category) throw new NotFoundException('Category not found');
    return category;
  }

  async updateCategory(id: string, dto: UpdateCategoryDto) {
    await this.assertCategory(id);
    if (dto.slug) await this.assertUniqueCategorySlug(dto.slug, id);
    if (dto.parentId) {
      if (dto.parentId === id) throw new BadRequestException('Category cannot be its own parent');
      await this.assertCategory(dto.parentId);
    }
    return this.prisma.category.update({ where: { id }, data: dto });
  }

  async deleteCategory(id: string) {
    await this.assertCategory(id);
    await this.prisma.category.delete({ where: { id } });
    return { deleted: true };
  }

  async createBrand(dto: CreateBrandDto) {
    await this.assertUniqueBrandSlug(dto.slug);
    return this.prisma.brand.create({ data: dto });
  }

  listAdminBrands(query: CatalogQueryDto) {
    return this.paginate(this.prisma.brand as unknown as PaginateDelegate, this.brandWhere(query), query, { createdAt: 'desc' });
  }

  async getAdminBrand(id: string) {
    const brand = await this.prisma.brand.findUnique({ where: { id } });
    if (!brand) throw new NotFoundException('Brand not found');
    return brand;
  }

  async updateBrand(id: string, dto: UpdateBrandDto) {
    await this.assertBrand(id);
    if (dto.slug) await this.assertUniqueBrandSlug(dto.slug, id);
    return this.prisma.brand.update({ where: { id }, data: dto });
  }

  async deleteBrand(id: string) {
    await this.assertBrand(id);
    await this.prisma.brand.delete({ where: { id } });
    return { deleted: true };
  }

  async createProduct(dto: CreateProductDto) {
    await this.validateProductPayload(dto);
    const { categoryIds, ...data } = dto;
    return this.prisma.product.create({
      data: {
        ...data,
        currency: dto.currency?.toUpperCase() ?? 'USD',
        categories: categoryIds?.length ? { create: categoryIds.map((categoryId) => ({ categoryId })) } : undefined,
      },
      include: productInclude,
    });
  }

  listAdminProducts(query: CatalogQueryDto) {
    return this.paginate(this.prisma.product as unknown as PaginateDelegate, this.productWhere(query, false), query, this.productOrder(query), productInclude);
  }

  async listProducts(query: CatalogQueryDto) {
    const key = `catalog:products:${JSON.stringify(query)}`;
    try {
      const cached = await this.redis.client.get(key);
      if (cached) return this.publicProductPage(JSON.parse(cached) as { items: unknown[]; page: number; limit: number; total: number; totalPages: number });
    } catch { /* database remains source of truth */ }
    const result = await this.paginate(this.prisma.product as unknown as PaginateDelegate, this.productWhere(query, true), query, this.productOrder(query), productInclude);
    const publicResult = this.publicProductPage(result);
    try { await this.redis.client.set(key, JSON.stringify(publicResult), 'EX', 60); } catch { /* cache is best effort */ }
    return publicResult;
  }

  async relatedProducts(id: string) {
    const product = await this.prisma.product.findUnique({ where: { id }, include: { categories: true } });
    if (!product) throw new NotFoundException('Product not found');
    const categoryIds = product.categories.map((item) => item.categoryId);
    const products = await this.prisma.product.findMany({
      where: { ...this.publicProductWhere({ id: { not: id } }), OR: [{ brandId: product.brandId ?? undefined }, { productType: product.productType }, { categories: { some: { categoryId: { in: categoryIds } } } }] },
      take: 8,
      orderBy: { createdAt: 'desc' },
      include: productInclude,
    });
    return products.map((item) => this.publicProduct(item));
  }

  featuredProducts(query: CatalogQueryDto) {
    return this.listProducts({ ...query, featured: true });
  }

  newArrivals(query: CatalogQueryDto) {
    return this.listProducts({ ...query, sort: 'newest' });
  }

  async getAdminProduct(id: string) {
    const product = await this.prisma.product.findUnique({ where: { id }, include: productInclude });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async getProductBySlug(slug: string) {
    const product = await this.prisma.product.findFirst({ where: this.publicProductWhere({ slug }), include: productInclude });
    if (!product) throw new NotFoundException('Product not found');
    return this.publicProduct(product);
  }

  async updateProduct(id: string, dto: UpdateProductDto) {
    await this.assertProduct(id);
    await this.validateProductPayload(dto, id);
    const { categoryIds, ...data } = dto;
    return this.prisma.$transaction(async (tx) => {
      if (categoryIds) {
        await tx.productCategory.deleteMany({ where: { productId: id } });
        if (categoryIds.length) await tx.productCategory.createMany({ data: categoryIds.map((categoryId) => ({ productId: id, categoryId })) });
      }
      return tx.product.update({ where: { id }, data: { ...data, currency: dto.currency?.toUpperCase() }, include: productInclude });
    });
  }

  async deleteProduct(id: string) {
    await this.assertProduct(id);
    await this.prisma.product.delete({ where: { id } });
    return { deleted: true };
  }

  updateProductStatus(id: string, status: CatalogStatus) {
    return this.prisma.product.update({ where: { id }, data: { status }, include: productInclude });
  }

  publishProduct(id: string) {
    return this.prisma.product.update({ where: { id }, data: { status: CatalogStatus.ACTIVE, publishedAt: new Date() }, include: productInclude });
  }

  unpublishProduct(id: string) {
    return this.prisma.product.update({ where: { id }, data: { status: CatalogStatus.DRAFT, publishedAt: null }, include: productInclude });
  }

  async createVariant(productId: string, dto: CreateVariantDto) {
    await this.assertProduct(productId);
    await this.validateVariantPayload(dto, productId);
    const { optionValueIds, ...data } = dto;
    return this.prisma.$transaction(async (tx) => {
      if (dto.isDefault) await tx.productVariant.updateMany({ where: { productId }, data: { isDefault: false } });
      const variant = await tx.productVariant.create({
        data: {
          ...data,
          productId,
          optionValues: optionValueIds?.length ? { create: optionValueIds.map((optionValueId) => ({ optionValueId })) } : undefined,
        },
        include: { optionValues: { include: { optionValue: { include: { option: true } } } }, images: true },
      });
      await tx.product.update({ where: { id: productId }, data: { productType: ProductType.VARIABLE } });
      return variant;
    });
  }

  async listVariants(productId: string) {
    await this.assertProduct(productId);
    return this.prisma.productVariant.findMany({
      where: { productId },
      include: { optionValues: { include: { optionValue: { include: { option: true } } } }, images: true },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });
  }

  async updateVariant(productId: string, variantId: string, dto: UpdateVariantDto) {
    await this.assertVariant(productId, variantId);
    await this.validateVariantPayload(dto, productId, variantId);
    const { optionValueIds, ...data } = dto;
    return this.prisma.$transaction(async (tx) => {
      if (dto.isDefault) await tx.productVariant.updateMany({ where: { productId, NOT: { id: variantId } }, data: { isDefault: false } });
      if (optionValueIds) {
        await tx.productVariantOptionValue.deleteMany({ where: { variantId } });
        if (optionValueIds.length) await tx.productVariantOptionValue.createMany({ data: optionValueIds.map((optionValueId) => ({ variantId, optionValueId })) });
      }
      return tx.productVariant.update({ where: { id: variantId }, data, include: { optionValues: { include: { optionValue: { include: { option: true } } } }, images: true } });
    });
  }

  async deleteVariant(productId: string, variantId: string) {
    await this.assertVariant(productId, variantId);
    await this.prisma.productVariant.delete({ where: { id: variantId } });
    return { deleted: true };
  }

  async createOption(productId: string, dto: CreateOptionDto) {
    await this.assertProduct(productId);
    return this.prisma.productOption.create({
      data: {
        productId,
        name: dto.name,
        sortOrder: dto.sortOrder,
        values: dto.values?.length ? { create: dto.values } : undefined,
      },
      include: { values: { orderBy: { sortOrder: 'asc' } } },
    });
  }

  async listOptions(productId: string) {
    await this.assertProduct(productId);
    return this.prisma.productOption.findMany({
      where: { productId },
      include: { values: { orderBy: { sortOrder: 'asc' } } },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async updateOption(productId: string, optionId: string, dto: UpdateOptionDto) {
    await this.assertOption(productId, optionId);
    return this.prisma.$transaction(async (tx) => {
      if (dto.values) {
        await tx.productOptionValue.deleteMany({ where: { optionId } });
      }
      return tx.productOption.update({
        where: { id: optionId },
        data: {
          name: dto.name,
          sortOrder: dto.sortOrder,
          values: dto.values ? { create: dto.values } : undefined,
        },
        include: { values: { orderBy: { sortOrder: 'asc' } } },
      });
    });
  }

  async deleteOption(productId: string, optionId: string) {
    await this.assertOption(productId, optionId);
    await this.prisma.productOption.delete({ where: { id: optionId } });
    return { deleted: true };
  }

  async createImage(productId: string, dto: CreateImageDto) {
    await this.assertProduct(productId);
    this.validateImageUrl(dto.imageUrl);
    if (dto.variantId) await this.assertVariant(productId, dto.variantId);
    return this.prisma.$transaction(async (tx) => {
      if (dto.isPrimary) await tx.productImage.updateMany({ where: { productId }, data: { isPrimary: false } });
      return tx.productImage.create({ data: { ...dto, productId } });
    });
  }

  async listImages(productId: string) {
    await this.assertProduct(productId);
    return this.prisma.productImage.findMany({ where: { productId }, orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }] });
  }

  async updateImage(productId: string, imageId: string, dto: UpdateImageDto) {
    await this.assertImage(productId, imageId);
    if (dto.imageUrl) this.validateImageUrl(dto.imageUrl);
    if (dto.variantId) await this.assertVariant(productId, dto.variantId);
    return this.prisma.productImage.update({ where: { id: imageId }, data: dto });
  }

  async deleteImage(productId: string, imageId: string) {
    await this.assertImage(productId, imageId);
    await this.prisma.productImage.delete({ where: { id: imageId } });
    return { deleted: true };
  }

  async setPrimaryImage(productId: string, imageId: string) {
    await this.assertImage(productId, imageId);
    return this.prisma.$transaction(async (tx) => {
      await tx.productImage.updateMany({ where: { productId }, data: { isPrimary: false } });
      return tx.productImage.update({ where: { id: imageId }, data: { isPrimary: true } });
    });
  }

  listCategories(query: CatalogQueryDto) {
    return this.paginate(this.prisma.category as unknown as PaginateDelegate, { ...this.categoryWhere(query), status: CatalogStatus.ACTIVE }, query, [{ sortOrder: 'asc' }, { createdAt: 'desc' }], { children: true });
  }

  async getCategoryBySlug(slug: string) {
    const category = await this.prisma.category.findFirst({ where: { slug, status: CatalogStatus.ACTIVE }, include: { children: true } });
    if (!category) throw new NotFoundException('Category not found');
    return category;
  }

  async getCategoryProducts(slug: string, query: CatalogQueryDto) {
    const category = await this.getCategoryBySlug(slug);
    return this.listProducts({ ...query, category: category.id });
  }

  listBrands(query: CatalogQueryDto) {
    return this.paginate(this.prisma.brand as unknown as PaginateDelegate, { ...this.brandWhere(query), status: CatalogStatus.ACTIVE }, query, { createdAt: 'desc' });
  }

  async getBrandBySlug(slug: string) {
    const brand = await this.prisma.brand.findFirst({ where: { slug, status: CatalogStatus.ACTIVE } });
    if (!brand) throw new NotFoundException('Brand not found');
    return brand;
  }

  async getBrandProducts(slug: string, query: CatalogQueryDto) {
    const brand = await this.getBrandBySlug(slug);
    return this.listProducts({ ...query, brand: brand.id });
  }

  private categoryWhere(query: CatalogQueryDto): Prisma.CategoryWhereInput {
    return {
      status: query.status,
      OR: query.q ? [{ name: { contains: query.q, mode: 'insensitive' } }, { description: { contains: query.q, mode: 'insensitive' } }] : undefined,
    };
  }

  private brandWhere(query: CatalogQueryDto): Prisma.BrandWhereInput {
    return {
      status: query.status,
      OR: query.q ? [{ name: { contains: query.q, mode: 'insensitive' } }, { description: { contains: query.q, mode: 'insensitive' } }] : undefined,
    };
  }

  private productWhere(query: CatalogQueryDto, customerSafe: boolean): Prisma.ProductWhereInput {
    return {
      ...this.publicProductWhere(customerSafe ? {} : { status: query.status }),
      status: customerSafe ? CatalogStatus.ACTIVE : query.status,
      featured: query.featured,
      brandId: query.brand,
      categories: query.category ? { some: { categoryId: query.category } } : undefined,
      productType: query.productType,
      basePrice: query.minPrice !== undefined || query.maxPrice !== undefined ? { gte: query.minPrice, lte: query.maxPrice } : undefined,
      OR: query.q ? [{ name: { contains: query.q, mode: 'insensitive' } }, { shortDescription: { contains: query.q, mode: 'insensitive' } }, { description: { contains: query.q, mode: 'insensitive' } }, { brand: { name: { contains: query.q, mode: 'insensitive' } } }, { categories: { some: { category: { name: { contains: query.q, mode: 'insensitive' } } } } }] : undefined,
    };
  }

  private publicProductWhere(extra: Prisma.ProductWhereInput): Prisma.ProductWhereInput {
    return { status: CatalogStatus.ACTIVE, publishedAt: { not: null }, ...extra };
  }

  private productOrder(query: CatalogQueryDto): Prisma.ProductOrderByWithRelationInput {
    if (query.sort === 'price_asc') return { basePrice: 'asc' };
    if (query.sort === 'price_desc') return { basePrice: 'desc' };
    if (query.sort === 'name_asc') return { name: 'asc' };
    if (query.sort === 'name_desc') return { name: 'desc' };
    if (query.sort === 'oldest') return { createdAt: 'asc' };
    return { createdAt: 'desc' };
  }

  private async paginate(
    model: PaginateDelegate,
    where: Record<string, unknown>,
    query: CatalogQueryDto,
    orderBy: Record<string, unknown> | Record<string, unknown>[],
    include?: Record<string, unknown>,
  ) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 12;
    const [items, total] = await Promise.all([
      model.findMany({ where, orderBy, include, skip: (page - 1) * limit, take: limit }),
      model.count({ where }),
    ]);
    return { items, page, limit, total, totalPages: Math.ceil(total / limit) };
  }

  private publicProductPage(page: { items: unknown[]; page: number; limit: number; total: number; totalPages: number }) {
    return {
      ...page,
      items: page.items.map((item) => this.publicProduct(item as ProductWithPublicRelations)),
    };
  }

  private publicProduct(product: ProductWithPublicRelations) {
    const { costPrice: productCostPrice, ...safeProduct } = product;
    void productCostPrice;

    return {
      ...safeProduct,
      variants: product.variants.map((variant) => {
        const { costPrice: variantCostPrice, ...safeVariant } = variant;
        void variantCostPrice;
        return safeVariant;
      }),
    };
  }

  private async validateProductPayload(dto: Partial<CreateProductDto>, currentId?: string) {
    if (dto.slug) await this.assertUniqueProductSlug(dto.slug, currentId);
    if (dto.brandId) await this.assertBrand(dto.brandId);
    if (dto.categoryIds?.length) await Promise.all(dto.categoryIds.map((id) => this.assertCategory(id)));
    if (dto.compareAtPrice !== undefined && dto.basePrice !== undefined && dto.compareAtPrice < dto.basePrice) {
      throw new BadRequestException('Compare price must be greater than or equal to base price');
    }
  }

  private async validateVariantPayload(dto: Partial<CreateVariantDto>, productId: string, currentId?: string) {
    if (dto.sku) await this.assertUniqueVariantField('sku', dto.sku, currentId);
    if (dto.barcode) await this.assertUniqueVariantField('barcode', dto.barcode, currentId);
    if (dto.compareAtPrice !== undefined && dto.price !== undefined && dto.compareAtPrice < dto.price) {
      throw new BadRequestException('Compare price must be greater than or equal to price');
    }
    if (dto.optionValueIds?.length) {
      const count = await this.prisma.productOptionValue.count({ where: { id: { in: dto.optionValueIds }, option: { productId } } });
      if (count !== dto.optionValueIds.length) throw new BadRequestException('Invalid option value for product variant');
    }
  }

  private validateImageUrl(url: string) {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      throw new BadRequestException('Image URL must be a valid HTTPS URL');
    }
    if (parsed.protocol !== 'https:') throw new BadRequestException('Image URL must use HTTPS');
    if (!/\.(png|jpe?g|webp|gif|avif)(\?.*)?$/i.test(parsed.pathname + parsed.search)) throw new BadRequestException('Invalid image format');

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    if (process.env.NODE_ENV === 'production' && cloudName) {
      const isManagedCloudinaryAsset = parsed.hostname === 'res.cloudinary.com' && parsed.pathname.startsWith(`/${cloudName}/`);
      if (!isManagedCloudinaryAsset) throw new BadRequestException('Production product media must be hosted in the configured Cloudinary account');
    }
  }

  private async assertUniqueCategorySlug(slug: string, currentId?: string) {
    const existing = await this.prisma.category.findUnique({ where: { slug } });
    if (existing && existing.id !== currentId) throw new ConflictException('Category slug is already used');
  }

  private async assertUniqueBrandSlug(slug: string, currentId?: string) {
    const existing = await this.prisma.brand.findUnique({ where: { slug } });
    if (existing && existing.id !== currentId) throw new ConflictException('Brand slug is already used');
  }

  private async assertUniqueProductSlug(slug: string, currentId?: string) {
    const existing = await this.prisma.product.findUnique({ where: { slug } });
    if (existing && existing.id !== currentId) throw new ConflictException('Product slug is already used');
  }

  private async assertUniqueVariantField(field: 'sku' | 'barcode', value: string, currentId?: string) {
    const existing = await this.prisma.productVariant.findFirst({ where: { [field]: value } });
    if (existing && existing.id !== currentId) throw new ConflictException(`${field.toUpperCase()} is already used`);
  }

  private async assertCategory(id: string) {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) throw new NotFoundException('Category not found');
    return category;
  }

  private async assertBrand(id: string) {
    const brand = await this.prisma.brand.findUnique({ where: { id } });
    if (!brand) throw new NotFoundException('Brand not found');
    return brand;
  }

  private async assertProduct(id: string) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  private async assertVariant(productId: string, variantId: string) {
    const variant = await this.prisma.productVariant.findFirst({ where: { id: variantId, productId } });
    if (!variant) throw new NotFoundException('Variant not found');
    return variant;
  }

  private async assertOption(productId: string, optionId: string) {
    const option = await this.prisma.productOption.findFirst({ where: { id: optionId, productId } });
    if (!option) throw new NotFoundException('Product option not found');
    return option;
  }

  private async assertImage(productId: string, imageId: string) {
    const image = await this.prisma.productImage.findFirst({ where: { id: imageId, productId } });
    if (!image) throw new NotFoundException('Image not found');
    return image;
  }
}
