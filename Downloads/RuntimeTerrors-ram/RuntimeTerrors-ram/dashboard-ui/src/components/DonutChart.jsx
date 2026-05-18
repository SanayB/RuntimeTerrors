import { useEffect, useRef } from 'react';
import { PieChart } from 'lucide-react';
import { RISK_COLORS } from '../utils';

const KEYS   = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
const LABELS = { CRITICAL: 'Critical', HIGH: 'High', MEDIUM: 'Medium', LOW: 'Low' };

function ScoreRing({ breakdown }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = 150, H = 150, CX = 75, CY = 75, R = 52, THICK = 18;
    canvas.width = W; canvas.height = H;

    let total = KEYS.reduce((a, k) => a + (breakdown[k] || 0), 0);
    if (total === 0) { ctx.clearRect(0, 0, W, H); return; }

    ctx.clearRect(0, 0, W, H);

    // Background track
    ctx.beginPath();
    ctx.arc(CX, CY, R, 0, Math.PI * 2);
    ctx.lineWidth = THICK;
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.stroke();

    let angle = -Math.PI / 2;
    KEYS.forEach(k => {
      const val = breakdown[k] || 0;
      if (val === 0) return;
      const slice = (val / total) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(CX, CY, R, angle, angle + slice);
      ctx.lineWidth = THICK;
      ctx.lineCap = 'round';
      ctx.strokeStyle = RISK_COLORS[k];
      ctx.stroke();
      angle += slice;
    });

    // Center text
    ctx.fillStyle = '#f0f4ff';
    ctx.font = 'bold 22px Inter';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(total, CX, CY - 7);
    ctx.fillStyle = '#4d6275';
    ctx.font = '10px Inter';
    ctx.fillText('total', CX, CY + 10);
  }, [breakdown]);

  return <canvas ref={canvasRef} style={{ width: 150, height: 150 }} />;
}

export default function DonutChart({ breakdown = {} }) {
  const total = KEYS.reduce((a, k) => a + (breakdown[k] || 0), 0);

  return (
    <div className="panel" style={{ animationDelay: '0.05s' }}>
      <div className="panel-header">
        <span className="panel-title">
          <PieChart size={15} /> Risk Distribution
        </span>
      </div>
      <div className="panel-body">
        <div className="donut-wrap">
          <ScoreRing breakdown={breakdown} />
          <div className="donut-legend">
            {KEYS.map(k => (
              <div key={k} className="legend-row">
                <div className="legend-left">
                  <div className="legend-dot" style={{ background: RISK_COLORS[k] }} />
                  {LABELS[k]}
                </div>
                <span className="legend-count">{breakdown[k] || 0}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
