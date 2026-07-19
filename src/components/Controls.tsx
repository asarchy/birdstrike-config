// 汎用パラメータコントロール: 値はストア (bs) が持ち、変更は即デバイスへ送信
import { bs, useConfig } from '../birdstrike';

interface RowProps {
	t: number;
	id: number;
	label: string;
}

export function SliderRow({ t, id, label, min, max, scale = 1, step = 1 }:
	RowProps & { min: number; max: number; scale?: number; step?: number }) {
	useConfig();
	const value = bs.getVal(t, id) / scale;
	const commit = (v: number) => {
		v = Math.max(min, Math.min(max, v || 0));
		bs.setParam(t, id, 0, v * scale);
	};
	return (
		<div className="row">
			<label>{label}</label>
			<input type="range" min={min} max={max} step={step} value={value}
				onChange={(e) => commit(+e.target.value)} />
			<input type="number" min={min} max={max} step={step} value={value}
				onChange={(e) => commit(+e.target.value)} />
		</div>
	);
}

export function NumberRow({ t, id, label, min, max, scale = 1, step = 1 }:
	RowProps & { min: number; max: number; scale?: number; step?: number }) {
	useConfig();
	return (
		<div className="row">
			<label>{label}</label>
			<input type="number" min={min} max={max} step={step}
				value={bs.getVal(t, id) / scale}
				onChange={(e) => bs.setParam(t, id, 0, Math.round((+e.target.value || 0) * scale))} />
		</div>
	);
}

export function CheckRow({ t, id, label }: RowProps) {
	useConfig();
	return (
		<div className="row">
			<label>{label}</label>
			<input type="checkbox" checked={!!bs.getVal(t, id)}
				onChange={(e) => bs.setParam(t, id, 0, e.target.checked ? 1 : 0)} />
		</div>
	);
}

export function SelectRow({ t, id, label, options }:
	RowProps & { options: [number, string][] }) {
	useConfig();
	return (
		<div className="row">
			<label>{label}</label>
			<select value={bs.getVal(t, id)}
				onChange={(e) => bs.setParam(t, id, 0, +e.target.value)}>
				{options.map(([v, text]) => <option key={v} value={v}>{text}</option>)}
			</select>
		</div>
	);
}

// X/Y ペア配列 + ポイント数スライダー (感度カーブ / RC 速度カーブ用)
export function PointsTable({ t, idX, idY, idCount, maxPts, countLabel, xLabel, yLabel }: {
	t: number; idX: number; idY: number; idCount: number; maxPts: number;
	countLabel: string; xLabel: string; yLabel: string;
}) {
	useConfig();
	const count = Math.min(bs.getVal(t, idCount) || 1, maxPts);
	return (
		<div>
			<div className="row">
				<label>{countLabel}</label>
				<input type="range" min={1} max={maxPts} step={1} value={count}
					onChange={(e) => bs.setParam(t, idCount, 0, +e.target.value)} />
				<span>{count}</span>
			</div>
			<table className="pts">
				<thead>
					<tr><th>#</th><th>{xLabel}</th><th>{yLabel}</th></tr>
				</thead>
				<tbody>
					{Array.from({ length: count }, (_, i) => (
						<tr key={i}>
							<td>{i + 1}</td>
							<td><input type="number" value={bs.getVal(t, idX, i)}
								onChange={(e) => bs.setParam(t, idX, i, Math.round(+e.target.value || 0))} /></td>
							<td><input type="number" value={bs.getVal(t, idY, i)}
								onChange={(e) => bs.setParam(t, idY, i, Math.round(+e.target.value || 0))} /></td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}
