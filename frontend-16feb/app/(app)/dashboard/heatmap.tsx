export function Heatmap({ rollup }: { rollup: Record<string, any> }) {
  const keys = Object.keys(rollup || {}).sort();
  return (
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
      {keys.map((k) => {
        const r = rollup[k];
        const cov = Number(r.coverage_pct || 0);
        const stale = Number(r.stale_pct || 0);
        const bg = cov >= 90 ? '#e8fff0' : cov >= 70 ? '#fff7e6' : '#ffecec';
        return (
          <div key={k} style={{ padding: 12, border: '1px solid #eee', borderRadius: 12, minWidth: 180, background: bg }}>
            <div style={{ fontFamily: 'monospace', fontWeight: 700 }}>{k}</div>
            <div style={{ opacity: 0.75, fontSize: 12 }}>controls: {r.total}</div>
            <div style={{ marginTop: 8 }}>
              <div>coverage: <b>{cov}%</b></div>
              <div>stale: <b>{stale}%</b></div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
