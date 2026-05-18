import { useEffect, useRef } from 'react';
import { TrendingUp } from 'lucide-react';

export default function TimelineChart({ timeline = [] }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || timeline.length === 0) return;

    const draw = () => {
      const parent = canvas.parentElement;
      const W = parent.clientWidth;
      const H = parent.clientHeight || 160;
      canvas.width  = W * window.devicePixelRatio;
      canvas.height = H * window.devicePixelRatio;
      canvas.style.width  = W + 'px';
      canvas.style.height = H + 'px';

      const ctx = canvas.getContext('2d');
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

      const PAD_L = 10, PAD_R = 10, PAD_T = 14, PAD_B = 30;
      const chartW = W - PAD_L - PAD_R;
      const chartH = H - PAD_T - PAD_B;

      const maxVal = Math.max(...timeline.map(d => d.count), 5);
      const stepX  = chartW / Math.max(timeline.length - 1, 1);

      // Grid lines
      ctx.strokeStyle = 'rgba(255,255,255,0.04)';
      ctx.lineWidth   = 1;
      for (let i = 0; i <= 3; i++) {
        const y = PAD_T + (chartH / 3) * i;
        ctx.beginPath();
        ctx.moveTo(PAD_L, y);
        ctx.lineTo(W - PAD_R, y);
        ctx.stroke();
      }

      // Date labels
      ctx.fillStyle = '#4d6275';
      ctx.font = `${9 * window.devicePixelRatio / window.devicePixelRatio}px Inter`;
      ctx.textAlign = 'center';
      const step = Math.max(1, Math.floor(timeline.length / 6));
      timeline.forEach((d, i) => {
        if (i % step !== 0 && i !== timeline.length - 1) return;
        const x = PAD_L + i * stepX;
        const label = new Date(d.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        ctx.fillText(label, x, H - 6);
      });

      const toXY = (i, val) => ({
        x: PAD_L + i * stepX,
        y: PAD_T + chartH - (val / maxVal) * chartH,
      });

      // Total area fill
      const grad = ctx.createLinearGradient(0, PAD_T, 0, PAD_T + chartH);
      grad.addColorStop(0, 'rgba(0,210,255,0.18)');
      grad.addColorStop(1, 'rgba(0,210,255,0)');

      ctx.beginPath();
      timeline.forEach((d, i) => {
        const { x, y } = toXY(i, d.count);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
      ctx.lineTo(PAD_L + (timeline.length - 1) * stepX, PAD_T + chartH);
      ctx.lineTo(PAD_L, PAD_T + chartH);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();

      // Total line
      ctx.beginPath();
      ctx.strokeStyle = '#00d2ff';
      ctx.lineWidth = 2.5;
      ctx.lineJoin = 'round';
      timeline.forEach((d, i) => {
        const { x, y } = toXY(i, d.count);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
      ctx.stroke();

      // Dots on Total line
      ctx.fillStyle = '#00d2ff';
      timeline.forEach((d, i) => {
        const { x, y } = toXY(i, d.count);
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
      });

      // Critical line
      ctx.beginPath();
      ctx.strokeStyle = '#ff3b5c';
      ctx.lineWidth = 1.8;
      ctx.setLineDash([4, 4]);
      timeline.forEach((d, i) => {
        const { x, y } = toXY(i, d.criticalCount || 0);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
      ctx.stroke();
      ctx.setLineDash([]);
    };

    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(canvas.parentElement);
    return () => ro.disconnect();
  }, [timeline]);

  return (
    <div className="panel" style={{ animationDelay: '0.1s', display: 'flex', flexDirection: 'column' }}>
      <div className="panel-header">
        <span className="panel-title">
          <TrendingUp size={15} /> 14-Day Activity Trend
        </span>
        <div className="chart-legend">
          <div className="chart-legend-item">
            <div className="chart-legend-line" style={{ background: '#00d2ff' }} />
            Total scans
          </div>
          <div className="chart-legend-item">
            <div className="chart-legend-line" style={{ background: '#ff3b5c', backgroundImage: 'repeating-linear-gradient(90deg,#ff3b5c 0,#ff3b5c 4px,transparent 4px,transparent 8px)' }} />
            Critical
          </div>
        </div>
      </div>
      <div className="panel-body" style={{ flex: 1 }}>
        <div style={{ height: 160, position: 'relative' }}>
          <canvas ref={canvasRef} style={{ display: 'block' }} />
        </div>
      </div>
    </div>
  );
}
