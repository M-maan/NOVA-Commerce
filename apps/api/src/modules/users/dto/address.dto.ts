import { IsBoolean, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class AddressDto {
  @IsString()
  @MaxLength(60)
  title!: string;

  @IsString()
  @MaxLength(120)
  fullName!: string;

  // Accept common local and international formats (for example 03001234567 or +923001234567).
  @Matches(/^\+?[0-9][0-9\s-]{6,19}$/, { message: 'phone must be a valid phone number' })
  phone!: string;

  @IsString()
  @MaxLength(80)
  country!: string;

  @IsString()
  @MaxLength(80)
  province!: string;

  @IsString()
  @MaxLength(80)
  city!: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  postalCode?: string;

  @IsString()
  @MaxLength(180)
  addressLine1!: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  addressLine2?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
