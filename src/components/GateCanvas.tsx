// 測定したゲート形状の極座標プロット
//   橙のポリゴン = 測ったゲート境界 (方向ごとの最大半径)
//   灰の破線     = 単位円 (正規化後の到達目標)
//   青の点       = いま入力されている生の位置
//   赤の扇       = まだ測れていない方向
import { useEffect, useRef } from 'react';
import { bs, useLive, GATE_BINS } from '../birdstrike';

export function GateCanvas({ stick, size = 300 }: { stick: 0 | 1; size?: number }) {
	useLive();
	const ref = useRef<HTMLCanvasElement>(null);
	const host = bs.host;

	useEffect(() => {
		const cv = ref.current;
		if (!cv) return;
		const ctx = cv.getContext('2d')!;
		const W = cv.width, H = cv.height, cx = W / 2, cy = H / 2;
		// ゲートは対角で単位円の外に出るので、余裕をみて 1.5 を画面端に置く
		const R = (W / 2 - 14) / 1.5;
		ctx.clearRect(0, 0, W, H);

		// 角度 i (0 = 上, 時計回り) の描画座標。画面 Y は下向きなので反転
		const at = (i: number, r: number): [number, number] => {
			const a = (i * 2 * Math.PI) / GATE_BINS;
			return [cx + Math.sin(a) * r * R, cy - Math.cos(a) * r * R];
		};

		ctx.strokeStyle = '#333945';
		ctx.lineWidth = 1;
		ctx.beginPath(); ctx.moveTo(cx, cy - R * 1.5); ctx.lineTo(cx, cy + R * 1.5);
		ctx.moveTo(cx - R * 1.5, cy); ctx.lineTo(cx + R * 1.5, cy);
		ctx.stroke();

		// 単位円 = 正規化後にすべての方向が到達すべき線
		ctx.strokeStyle = '#5a6373';
		ctx.setLineDash([4, 4]);
		ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
		ctx.setLineDash([]);

		// 未測定の方向を扇で示す: どこを回し足りないかが一目で分かる
		const step = (2 * Math.PI) / GATE_BINS;
		ctx.fillStyle = 'rgba(255, 107, 107, 0.10)';
		for (let i = 0; i < GATE_BINS; i++) {
			if (host.radius[i] > 0) continue;
			const a = i * step - Math.PI / 2 - step / 2;
			ctx.beginPath();
			ctx.moveTo(cx, cy);
			ctx.arc(cx, cy, R * 1.5, a, a + step);
			ctx.closePath();
			ctx.fill();
		}

		// 測ったゲート境界
		const measured = host.radius.some((r) => r > 0);
		if (measured) {
			ctx.strokeStyle = '#f0883e';
			ctx.fillStyle = 'rgba(240, 136, 62, 0.12)';
			ctx.lineWidth = 2;
			ctx.beginPath();
			let started = false;
			for (let i = 0; i <= GATE_BINS; i++) {
				const idx = i % GATE_BINS;
				const r = host.radius[idx] / 1000;
				if (r <= 0) continue;
				const [x, y] = at(idx, r);
				if (!started) { ctx.moveTo(x, y); started = true; } else ctx.lineTo(x, y);
			}
			ctx.closePath();
			ctx.fill();
			ctx.stroke();

			ctx.fillStyle = '#f0883e';
			for (let i = 0; i < GATE_BINS; i++) {
				const r = host.radius[i] / 1000;
				if (r <= 0) continue;
				const [x, y] = at(i, r);
				ctx.beginPath(); ctx.arc(x, y, 2.5, 0, Math.PI * 2); ctx.fill();
			}
		}

		// 現在位置。中心は較正で測った中心を使う (未測定なら公称中心)
		const c0 = host.center[0] || 32768, c1 = host.center[1] || 32768;
		const rx = stick === 0 ? host.raw.lx : host.raw.rx;
		const ry = stick === 0 ? host.raw.ly : host.raw.ry;
		const px = cx + ((rx - c0) / 32768) * R;
		const py = cy + ((ry - c1) / 32768) * R;
		ctx.strokeStyle = '#58a6ff';
		ctx.lineWidth = 1;
		ctx.beginPath(); ctx.moveTo(px - 7, py); ctx.lineTo(px + 7, py);
		ctx.moveTo(px, py - 7); ctx.lineTo(px, py + 7);
		ctx.stroke();
		ctx.fillStyle = '#58a6ff';
		ctx.beginPath(); ctx.arc(px, py, 3, 0, Math.PI * 2); ctx.fill();
	});

	return <canvas ref={ref} width={size} height={size} className="gateCanvas" />;
}
