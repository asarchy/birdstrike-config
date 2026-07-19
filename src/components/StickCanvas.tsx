// スティック位置のクロスヘア表示
//   灰 = 生値（キャリブレーション + 方向スケール適用後） / 青 = 実際の出力
//   橙の枠 = 対角スケールによる出力の到達範囲 (min(正方形, 楕円))
import { useEffect, useRef } from 'react';
import { bs, useConfig, useLive, SP } from '../birdstrike';

// ファーム scalePct(): 0 は 100% 扱い
const scalePct = (v: number) => (v === 0 ? 100 : v) / 100;

export function StickCanvas({ stick, size, showVals = true }: {
	stick: 0 | 1; size: number; showVals?: boolean;
}) {
	useLive();
	useConfig();
	const ref = useRef<HTMLCanvasElement>(null);
	const view = bs.stickView(stick);

	useEffect(() => {
		const cv = ref.current;
		if (!cv) return;
		const ctx = cv.getContext('2d')!;
		const W = cv.width, H = cv.height, cx = W / 2, cy = H / 2, R = W / 2 - 8;
		ctx.clearRect(0, 0, W, H);
		ctx.strokeStyle = '#333945';
		ctx.lineWidth = 1;
		ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
		ctx.beginPath(); ctx.arc(cx, cy, R / 2, 0, Math.PI * 2); ctx.stroke();
		ctx.beginPath();
		ctx.moveTo(cx, cy - R); ctx.lineTo(cx, cy + R);
		ctx.moveTo(cx - R, cy); ctx.lineTo(cx + R, cy);
		ctx.stroke();

		// デッドゾーン可視化: 内側 = 赤帯 (この範囲は出力0), 外側 = 青破線 (ここで最大)
		const ix = bs.getVal(stick, SP.innerX) / 100;
		const iy = bs.getVal(stick, SP.innerY) / 100;
		ctx.fillStyle = 'rgba(255, 107, 107, 0.10)';
		if (ix > 0) ctx.fillRect(cx - ix * R, cy - R, 2 * ix * R, 2 * R);
		if (iy > 0) ctx.fillRect(cx - R, cy - iy * R, 2 * R, 2 * iy * R);
		const odx = bs.getVal(stick, SP.outerX) / 100;
		const ody = bs.getVal(stick, SP.outerY) / 100;
		ctx.strokeStyle = 'rgba(77, 163, 255, 0.35)';
		ctx.setLineDash([3, 3]);
		if (odx > 0 && odx < 1) {
			ctx.beginPath();
			ctx.moveTo(cx - odx * R, cy - R); ctx.lineTo(cx - odx * R, cy + R);
			ctx.moveTo(cx + odx * R, cy - R); ctx.lineTo(cx + odx * R, cy + R);
			ctx.stroke();
		}
		if (ody > 0 && ody < 1) {
			ctx.beginPath();
			ctx.moveTo(cx - R, cy - ody * R); ctx.lineTo(cx + R, cy - ody * R);
			ctx.moveTo(cx - R, cy + ody * R); ctx.lineTo(cx + R, cy + ody * R);
			ctx.stroke();
		}
		ctx.setLineDash([]);

		// 対角スケール境界: r(θ) = min(単位正方形, 半径 1+0.4142*d/100 の楕円)
		const dx = bs.getVal(stick, SP.diagScaleX);
		const dy = bs.getVal(stick, SP.diagScaleY);
		if (dx > 0 || dy > 0) {
			const ex = 1 + 0.4142 * dx / 100;
			const ey = 1 + 0.4142 * dy / 100;
			ctx.strokeStyle = 'rgba(255, 181, 77, 0.7)';
			ctx.setLineDash([4, 3]);
			ctx.beginPath();
			for (let i = 0; i <= 128; i++) {
				const th = (i / 128) * Math.PI * 2;
				const c = Math.cos(th), s = Math.sin(th);
				const rSquare = 1 / Math.max(Math.abs(c), Math.abs(s));
				const rEllipse = (ex * ey) / Math.sqrt((ey * c) ** 2 + (ex * s) ** 2);
				const r = Math.min(rSquare, rEllipse) * R;
				if (i === 0) ctx.moveTo(cx + r * c, cy + r * s);
				else ctx.lineTo(cx + r * c, cy + r * s);
			}
			ctx.closePath();
			ctx.stroke();
			ctx.setLineDash([]);
		}

		// 生値: ファームと同じ方向スケールを適用して表示 (fx>=0→右, fy>=0→上の定義)
		if (view.nx !== null && view.ny !== null) {
			const sx = view.nx * scalePct(view.nx >= 0
				? bs.getVal(stick, SP.scaleRight) : bs.getVal(stick, SP.scaleLeft));
			const sy = view.ny * scalePct(view.ny >= 0
				? bs.getVal(stick, SP.scaleUp) : bs.getVal(stick, SP.scaleDown));
			const lim = (W / 2 - 3) / R;
			const px = Math.max(-lim, Math.min(lim, sx));
			const py = Math.max(-lim, Math.min(lim, sy));
			ctx.fillStyle = '#98a1ad';
			ctx.beginPath(); ctx.arc(cx + px * R, cy + py * R, 4, 0, Math.PI * 2); ctx.fill();
		}

		// 出力
		ctx.fillStyle = '#4da3ff';
		ctx.beginPath(); ctx.arc(cx + view.ox * R, cy + view.oy * R, 5.5, 0, Math.PI * 2); ctx.fill();
	});

	return (
		<div>
			<canvas ref={ref} width={size} height={size} />
			{showVals && (
				<div className="vals">
					{`raw  X:${view.rawX ?? '-----'}  Y:${view.rawY ?? '-----'}\n`}
					{`out  X:${view.outX}  Y:${view.outY}`}
				</div>
			)}
		</div>
	);
}
