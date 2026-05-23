import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Product } from '../../entities/product.entity';
import { MATERIALS, COLORS, SIZES, COUNTRIES } from '../telegram-bot/constants';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly repo: Repository<Product>,
  ) {}

  async create(
    data: Omit<Product, 'id' | 'createdAt' | 'isPublished' | 'publishedPost' | 'publishedWaPost'>,
  ): Promise<Product> {
    return this.repo.save(this.repo.create(data));
  }

  async getCustomBrands(): Promise<string[]> {
    const rows = await this.repo.query(
      `SELECT brand, COUNT(*) AS cnt FROM products
       WHERE brand IS NOT NULL AND brand <> ''
       GROUP BY brand
       ORDER BY cnt DESC, brand ASC`,
    );
    return (rows as any[]).map((r) => r.brand as string);
  }

  async getFilterOptions() {
    const merge = (preset: string[], db: string[]) =>
      [...new Set([...preset, ...db.filter(Boolean)])];

    const [materialsRaw, colorsRaw, sizesRaw, countriesRaw, brandsRaw] = await Promise.all([
      this.repo.query(
        `SELECT DISTINCT jsonb_array_elements_text(materials) AS val FROM products WHERE materials IS NOT NULL`,
      ),
      this.repo.query(
        `SELECT DISTINCT jsonb_array_elements_text(colors) AS val FROM products WHERE colors IS NOT NULL`,
      ),
      this.repo.query(
        `SELECT DISTINCT jsonb_array_elements_text(sizes) AS val FROM products WHERE sizes IS NOT NULL`,
      ),
      this.repo.query(
        `SELECT DISTINCT country FROM products WHERE country IS NOT NULL AND country <> ''`,
      ),
      this.repo.query(
        `SELECT DISTINCT brand FROM products WHERE brand IS NOT NULL AND brand <> '' ORDER BY brand`,
      ),
    ]);

    return {
      materials: merge(MATERIALS, (materialsRaw as any[]).map((r) => r.val)),
      colors: merge(COLORS, (colorsRaw as any[]).map((r) => r.val)),
      sizes: merge(
        [...SIZES.default, ...SIZES.shoes, ...SIZES.kids],
        (sizesRaw as any[]).map((r) => r.val),
      ),
      countries: merge(COUNTRIES, (countriesRaw as any[]).map((r) => r.country)),
      brands: (brandsRaw as any[]).map((r) => r.brand as string),
    };
  }

  async findAll(opts: {
    page: number;
    limit: number;
    gender?: string;
    category?: string;
    type?: string;
    brand?: string;
    search?: string;
    country?: string;
    materials?: string[];
    colors?: string[];
    sizes?: string[];
    priceMin?: number;
    priceMax?: number;
  }) {
    const { page, limit, gender, category, type, brand, search, country, materials, colors, sizes, priceMin, priceMax } = opts;
    const qb = this.repo.createQueryBuilder('p').orderBy('p.createdAt', 'DESC');

    if (gender) qb.andWhere('p.gender = :gender', { gender });
    if (category) qb.andWhere('p.category = :category', { category });
    if (type) qb.andWhere('p.type = :type', { type });
    if (search) {
      const like = `%${search.toLowerCase()}%`;
      qb.andWhere(
        '(LOWER(p.category) LIKE :like OR LOWER(p.type) LIKE :like OR LOWER(p.gender) LIKE :like OR LOWER(p.description) LIKE :like OR LOWER(p.country) LIKE :like)',
        { like },
      );
    }
    if (brand) qb.andWhere('p.brand = :brand', { brand });
    if (country) qb.andWhere('p.country = :country', { country });
    if (materials?.length) {
      qb.andWhere(
        `EXISTS (SELECT 1 FROM jsonb_array_elements_text(p.materials) elem WHERE elem IN (:...materials))`,
        { materials },
      );
    }
    if (colors?.length) {
      qb.andWhere(
        `EXISTS (SELECT 1 FROM jsonb_array_elements_text(p.colors) elem WHERE elem IN (:...colors))`,
        { colors },
      );
    }
    if (sizes?.length) {
      qb.andWhere(
        `EXISTS (SELECT 1 FROM jsonb_array_elements_text(p.sizes) elem WHERE elem IN (:...sizes))`,
        { sizes },
      );
    }
    let effectivePriceMin = priceMin;
    let effectivePriceMax = priceMax;
    if (effectivePriceMin != null && effectivePriceMax != null && effectivePriceMin > effectivePriceMax) {
      [effectivePriceMin, effectivePriceMax] = [effectivePriceMax, effectivePriceMin];
    }
    if (effectivePriceMin != null) {
      qb.andWhere(`CAST(SPLIT_PART(p.price, ' ', 1) AS NUMERIC) >= :priceMin`, { priceMin: effectivePriceMin });
    }
    if (effectivePriceMax != null) {
      qb.andWhere(`CAST(SPLIT_PART(p.price, ' ', 1) AS NUMERIC) <= :priceMax`, { priceMax: effectivePriceMax });
    }

    const [data, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      data,
      meta: {
        total,
        page,
        lastPage: Math.ceil(total / limit) || 1,
        limit,
      },
    };
  }

  async findOne(id: string): Promise<Product | null> {
    return this.repo.findOneBy({ id });
  }

  async update(
    id: string,
    data: Partial<Omit<Product, 'id' | 'createdAt'>>,
  ): Promise<Product> {
    await this.repo.update(id, data);
    return this.repo.findOneByOrFail({ id });
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete(id);
  }

  async findByIds(ids: string[]): Promise<Product[]> {
    if (!ids.length) return [];
    return this.repo.findBy({ id: In(ids) });
  }
}
