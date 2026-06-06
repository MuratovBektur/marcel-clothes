import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { Product } from '../../entities/product.entity';
import { MATERIALS, COLORS, SUIT_TYPES, SIZES } from '../telegram-bot/constants';

function readBotOptions(): { suitTypes: string[]; materials: string[]; colors: string[]; sizes: string[] } {
  try {
    return JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data', 'custom-options.json'), 'utf-8'));
  } catch {
    return { suitTypes: [...SUIT_TYPES], materials: [...MATERIALS], colors: [...COLORS], sizes: [...SIZES.default] };
  }
}

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

  async getFilterOptions() {
    const merge = (preset: string[], db: string[]) =>
      [...new Set([...preset, ...db.filter(Boolean)])];

    const results = await Promise.allSettled([
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
        `SELECT DISTINCT "type" AS val FROM products WHERE "type" IS NOT NULL AND "type" != ''`,
      ),
    ]);

    const rows = (i: number): any[] =>
      results[i].status === 'fulfilled' ? (results[i] as PromiseFulfilledResult<any[]>).value : [];

    const botOptions = readBotOptions();

    return {
      materials: merge(botOptions.materials, rows(0).map((r) => r.val)),
      colors: merge(botOptions.colors, rows(1).map((r) => r.val)),
      sizes: merge(botOptions.sizes, rows(2).map((r) => r.val)),
      types: merge(botOptions.suitTypes, rows(3).map((r) => r.val)),
    };
  }

  async findAll(opts: {
    page: number;
    limit: number;
    type?: string;
    search?: string;
    materials?: string[];
    colors?: string[];
    sizes?: string[];
    priceMin?: number;
    priceMax?: number;
  }) {
    const { page, limit, type, search, materials, colors, sizes, priceMin, priceMax } = opts;
    const qb = this.repo.createQueryBuilder('p').orderBy('p.createdAt', 'DESC');

    if (type) qb.andWhere('p.type = :type', { type });
    if (search) {
      const like = `%${search.toLowerCase()}%`;
      qb.andWhere(
        '(LOWER(p.type) LIKE :like OR LOWER(p.description) LIKE :like)',
        { like },
      );
    }
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
