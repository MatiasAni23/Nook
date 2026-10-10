/** Partition the selected period without gaps or double counting. */
export function buildReservationTimeline(
  dates: Date[],
  period: 30 | 90,
  now = new Date(),
) {
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - period);
  return Array.from({ length: Math.ceil(period / 7) }, (_, index) => {
    const start = new Date(cutoff);
    start.setDate(start.getDate() + index * 7);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    const finalBin = end >= now;
    return {
      label: `${start.getDate()}/${start.getMonth() + 1}`,
      reservas: dates.filter(
        (date) => date >= start && (finalBin ? date <= now : date < end),
      ).length,
    };
  });
}
