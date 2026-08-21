import type { Delivery, Driver, Location, Vehicle } from '../domain/models';

export const depot: Location = { lat: 35.6812, lng: 139.7671, x: 50, y: 49 };

export const initialDeliveries: Delivery[] = [
  { id: 'd-01', customerName: '東都メディカル', address: '港区海岸 2-4-8', location: { lat: 35.655, lng: 139.76, x: 36, y: 75 }, timeWindow: { start: 540, end: 660 }, serviceMinutes: 15, packageCount: 5, priority: 'high', notes: '受付で納品書を提示' },
  { id: 'd-02', customerName: '青葉商事', address: '中央区新川 1-12-3', location: { lat: 35.677, lng: 139.785, x: 69, y: 52 }, timeWindow: { start: 600, end: 720 }, serviceMinutes: 15, packageCount: 4, priority: 'normal' },
  { id: 'd-03', customerName: '丸の内フーズ', address: '千代田区丸の内 3-2-1', location: { lat: 35.68, lng: 139.764, x: 47, y: 43 }, timeWindow: { start: 570, end: 690 }, serviceMinutes: 20, packageCount: 8, priority: 'normal', notes: '冷蔵品あり' },
  { id: 'd-04', customerName: '浅草工芸', address: '台東区花川戸 2-6-5', location: { lat: 35.714, lng: 139.798, x: 78, y: 18 }, timeWindow: { start: 660, end: 840 }, serviceMinutes: 15, packageCount: 6, priority: 'normal' },
  { id: 'd-05', customerName: '品川テクノ', address: '品川区北品川 4-9-2', location: { lat: 35.62, lng: 139.74, x: 25, y: 88 }, timeWindow: { start: 720, end: 900 }, serviceMinutes: 25, packageCount: 9, priority: 'high' },
  { id: 'd-06', customerName: '神田文具センター', address: '千代田区神田 5-10-7', location: { lat: 35.695, lng: 139.77, x: 55, y: 31 }, timeWindow: { start: 540, end: 780 }, serviceMinutes: 10, packageCount: 3, priority: 'normal' },
  { id: 'd-07', customerName: '銀座リテール', address: '中央区銀座 6-3-4', location: { lat: 35.67, lng: 139.765, x: 45, y: 58 }, timeWindow: { start: 780, end: 960 }, serviceMinutes: 20, packageCount: 7, priority: 'normal' },
  { id: 'd-08', customerName: '芝浦ロジスティクス', address: '港区芝浦 3-8-6', location: { lat: 35.64, lng: 139.75, x: 31, y: 78 }, timeWindow: { start: 600, end: 810 }, serviceMinutes: 15, packageCount: 5, priority: 'normal' },
  { id: 'd-09', customerName: '日本橋サプライ', address: '中央区日本橋 2-7-1', location: { lat: 35.684, lng: 139.775, x: 59, y: 42 }, timeWindow: { start: 840, end: 1020 }, serviceMinutes: 15, packageCount: 4, priority: 'normal' },
  { id: 'd-10', customerName: '上野デザイン', address: '台東区上野 4-5-9', location: { lat: 35.707, lng: 139.774, x: 60, y: 21 }, timeWindow: { start: 750, end: 930 }, serviceMinutes: 15, packageCount: 6, priority: 'normal' },
];

export const vehicles: Vehicle[] = [
  { id: 'v-01', name: '1号車', color: '#2563eb', capacity: 64, startLocation: depot, availableFrom: 510, availableUntil: 1080 },
  { id: 'v-02', name: '2号車', color: '#ea580c', capacity: 64, startLocation: depot, availableFrom: 510, availableUntil: 1080 },
];

export const drivers: Driver[] = [
  { id: 'driver-01', name: '田中 太郎', assignedVehicleId: 'v-01' },
  { id: 'driver-02', name: '佐藤 美咲', assignedVehicleId: 'v-02' },
];
