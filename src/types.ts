/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum StationClass {
  EXTRA = 'ВН', // Внеклассная (red)
  CLASS_1 = 'I', // 1 класс (green)
  CLASS_2 = 'II', // 2 класс (cyan/blue)
  CLASS_3 = 'III', // 3 класс (yellow)
  CLASS_4 = 'IV', // 4 класс (orange)
  CLASS_5 = 'V', // 5 класс (light green)
}

export interface StationStaff {
  id: string;
  position: string;
  fullName: string;
  phone: string;
  email?: string;
}

export interface StationIndicator {
  id: string;
  metric: string;
  unit: string;
  plan: number;
  fact: number;
  percent: number;
}

export interface StationData {
  id: string;
  name: string;
  classType: StationClass;
  km: string; // Kilometer mark
  connections: string[]; // Adjacent station IDs for lines
  x: number; // SVG X coordinate
  y: number; // SVG Y coordinate
  labelPosition?: 'top' | 'bottom' | 'left' | 'right' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  labelAngle?: number; // Optional rotation angle for text labels
  description?: string; // Short info/summary
}

export interface StationDocument {
  stationId: string;
  docType: 'scheme' | 'tra';
  fileName: string;
  fileBlob: Blob;
  uploadedAt: string;
}
