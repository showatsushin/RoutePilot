import type { Delivery, ImportPreview, ImportRow, ImportValidationError, Vehicle } from '../../domain/models';
import type { LocationResolver } from '../../providers/location/LocationResolver';

export const REQUIRED_IMPORT_COLUMNS = [
  'delivery_id',
  'customer_name',
  'address',
  'time_window_start',
  'time_window_end',
  'service_minutes',
  'package_count',
  'priority',
  'preferred_vehicle',
  'notes',
] as const;

const parseTime = (value: string) => {
  const match = value.trim().match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
  return match ? Number(match[1]) * 60 + Number(match[2]) : undefined;
};

const positiveInteger = (value: string) => {
  if (!/^\d+$/.test(value.trim())) return undefined;
  const parsed = Number(value);
  return parsed > 0 ? parsed : undefined;
};

export const validateImportRows = (
  fileName: string,
  headers: string[],
  values: string[][],
  vehicles: Vehicle[],
  locationResolver: LocationResolver,
): ImportPreview => {
  const normalizedHeaders = headers.map((header) => header.trim().toLowerCase());
  const missing = REQUIRED_IMPORT_COLUMNS.filter((column) => !normalizedHeaders.includes(column));
  const errors: ImportValidationError[] = missing.map((column) => ({ rowNumber: 1, field: column, message: `必須列「${column}」がありません` }));
  if (missing.length) return { fileName, rows: [], deliveries: [], errors, isValid: false };

  const rows: ImportRow[] = values
    .filter((cells) => cells.some((cell) => cell.trim() !== ''))
    .map((cells, index) => {
      const value = (column: typeof REQUIRED_IMPORT_COLUMNS[number]) => cells[normalizedHeaders.indexOf(column)]?.trim() ?? '';
      return {
        rowNumber: index + 2,
        delivery_id: value('delivery_id'), customer_name: value('customer_name'), address: value('address'),
        time_window_start: value('time_window_start'), time_window_end: value('time_window_end'),
        service_minutes: value('service_minutes'), package_count: value('package_count'), priority: value('priority').toLowerCase(),
        preferred_vehicle: value('preferred_vehicle'), notes: value('notes'),
      };
    });

  const seenIds = new Set<string>();
  const deliveries: Delivery[] = [];

  for (const row of rows) {
    const addError = (field: string, message: string) => errors.push({ rowNumber: row.rowNumber, field, message });
    if (!row.delivery_id) addError('delivery_id', 'delivery_idは必須です');
    else if (seenIds.has(row.delivery_id)) addError('delivery_id', `delivery_id「${row.delivery_id}」が重複しています`);
    else seenIds.add(row.delivery_id);
    if (!row.customer_name) addError('customer_name', 'customer_nameは必須です');
    if (!row.address) addError('address', 'addressは必須です');

    const start = parseTime(row.time_window_start);
    const end = parseTime(row.time_window_end);
    if (start === undefined) addError('time_window_start', '時刻はHH:mm形式で入力してください');
    if (end === undefined) addError('time_window_end', '時刻はHH:mm形式で入力してください');
    if (start !== undefined && end !== undefined && start > end) addError('time_window_start', '開始時刻は終了時刻以前にしてください');

    const serviceMinutes = positiveInteger(row.service_minutes);
    const packageCount = positiveInteger(row.package_count);
    if (serviceMinutes === undefined) addError('service_minutes', '1以上の整数を入力してください');
    if (packageCount === undefined) addError('package_count', '1以上の整数を入力してください');
    if (row.priority !== 'normal' && row.priority !== 'high') addError('priority', 'priorityはnormalまたはhighを指定してください');

    const preferredVehicle = row.preferred_vehicle
      ? vehicles.find((vehicle) => vehicle.id === row.preferred_vehicle || vehicle.name === row.preferred_vehicle)
      : undefined;
    if (row.preferred_vehicle && !preferredVehicle) addError('preferred_vehicle', `車両「${row.preferred_vehicle}」は存在しません`);

    const location = row.customer_name && row.address ? locationResolver.resolve(row.customer_name, row.address) : undefined;
    if (row.customer_name && row.address && !location) addError('address', 'この無料デモでは未対応の住所です');

    const rowHasError = errors.some((error) => error.rowNumber === row.rowNumber);
    if (!rowHasError && start !== undefined && end !== undefined && serviceMinutes && packageCount && location) {
      deliveries.push({
        id: row.delivery_id,
        customerName: row.customer_name,
        address: row.address,
        location,
        timeWindow: { start, end },
        serviceMinutes,
        packageCount,
        priority: row.priority as 'normal' | 'high',
        preferredVehicleId: preferredVehicle?.id,
        notes: row.notes || undefined,
      });
    }
  }

  if (!rows.length) errors.push({ rowNumber: 1, field: 'file', message: '配送データがありません' });
  return { fileName, rows, deliveries: errors.length ? [] : deliveries, errors, isValid: errors.length === 0 };
};
