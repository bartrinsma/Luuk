import "server-only";
import { getDb } from "./db";

export interface Review {
  id: number;
  name: string;
  rating: number;
  period: string;
  body: string;
  published: boolean;
  created_at: string;
}

export async function listReviews(onlyPublished: boolean): Promise<Review[]> {
  const db = await getDb();
  return db.query<Review>(
    `SELECT * FROM ma_reviews ${onlyPublished ? "WHERE published" : ""} ORDER BY id`,
  );
}
