export function restoreHistory(record, snapshot) {
  const valid = snapshot?.version === 1 && snapshot.route?.start && snapshot.route?.destination && snapshot.ranked?.length
  const makePoint = prefix => {
    const lat = record[`${prefix}_lat`], lng = record[`${prefix}_lng`]
    return Number.isFinite(lat) && Number.isFinite(lng) ? {
      label: record[`${prefix}_label`] || record[`${prefix}_address`] || record[`${prefix}_region`],
      address: record[`${prefix}_address`], lat, lng,
    } : null
  }
  const startPoint = valid ? snapshot.route.start : makePoint('start')
  const endPoint = valid ? snapshot.route.destination : makePoint('destination')
  return {
    startPoint, endPoint,
    start: startPoint?.label || record.start_label || record.start_region,
    destination: endPoint?.label || record.destination_label || record.destination_region,
    route: valid ? snapshot.route : null,
    archived: valid ? snapshot : null,
    safetyLevel: valid ? snapshot.safetyLevel : record.safety_level,
    dataYear: String(record.data_year),
  }
}
