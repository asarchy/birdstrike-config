// 感度カーブのプレビュー描画
import { useEffect, useRef } from 'react';
import { bs, useConfig, CURVE_PRESETS, SP } from '../birdstrike';

const PAD = 7; // 端のポイント/マーカーが切れないための内側余白

export function CurveCanvas({ stick }: { stick: 0 | 1 }) {
	useConfig();
	const ref = useRef<HTMLCanvasElement>(null);

	useEffect(() => {
		const cv = ref.current;
		if (!cv) return;
		const ctx = cv.getContext('2d')!;
		const W = cv.width, H = cv.height;
		// 0..100 -> プロット領域 (PAD 内側)
		const px = (x: number) => PAD + (x / 100) * (W - PAD * 2);
		const py = (y: number) => H - PAD - (y / 100) * (H - PAD * 2);
		ctx.clearRect(0, 0, W, H);

		// グリッド + 外枠
		ctx.strokeStyle = '#333945';
		ctx.lineWidth = 1;
		for (let i = 1; i < 4; i++) {
			const gx = px(i * 25), gy = py(i * 25);
			ctx.beginPath(); ctx.moveTo(gx, py(0)); ctx.lineTo(gx, py(100)); ctx.stroke();
			ctx.beginPath(); ctx.moveTo(px(0), gy); ctx.lineTo(px(100), gy); ctx.stroke();
		}
		ctx.strokeRect(px(0), py(100), W - PAD * 2, H - PAD * 2);

		// y = x の基準線（半透明・破線）: これより上 = 増感, 下 = 減感
		ctx.strokeStyle = 'rgba(152, 161, 173, 0.35)';
		ctx.setLineDash([5, 4]);
		ctx.beginPath();
		ctx.moveTo(px(0), py(0)); ctx.lineTo(px(100), py(100));
		ctx.stroke();
		ctx.setLineDash([]);

		const preset = bs.getVal(stick, SP.curvePreset);
		let pts: number[][];
		if (preset >= 5) {
			// カスタム: マーカー間のみを結ぶ
			const n = Math.min(bs.getVal(stick, SP.curvePointCount) || 1, 10);
			pts = Array.from({ length: n }, (_, i) =>
				[bs.getVal(stick, SP.curveX, i), bs.getVal(stick, SP.curveY, i)]);
		} else {
			// プリセット: 原点を起点に含める
			pts = [[0, 0], ...(CURVE_PRESETS[preset]?.pts ?? CURVE_PRESETS[0].pts)];
		}

		// ポイント n と n+1 の間を順に結ぶ
		if (pts.length > 0) {
			ctx.strokeStyle = '#4da3ff';
			ctx.lineWidth = 2;
			ctx.beginPath();
			ctx.moveTo(px(pts[0][0]), py(pts[0][1]));
			for (let i = 1; i < pts.length; i++)
				ctx.lineTo(px(pts[i][0]), py(pts[i][1]));
			ctx.stroke();
		}

		ctx.lineWidth = 1;
		ctx.fillStyle = '#ffb54d';
		for (const [x, y] of pts) {
			ctx.beginPath(); ctx.arc(px(x), py(y), 3.5, 0, Math.PI * 2); ctx.fill();
		}
	});

	return <canvas className="curve" ref={ref} width={260} height={200} />;
}
