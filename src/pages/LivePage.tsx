import { bs, useLive } from '../birdstrike';
import { StickCanvas } from '../components/StickCanvas';

function TriggerBar({ label, value }: { label: string; value: number }) {
	return (
		<div className="trigbar">
			<span>{label}</span>
			<div className="bar"><div className="fill" style={{ width: `${value / 255 * 100}%` }} /></div>
			<span>{value}</span>
		</div>
	);
}

export function LivePage() {
	useLive();
	return (
		<div>
			<div className="liveWrap">
				<div className="liveStick">
					<h3>L スティック</h3>
					<StickCanvas stick={0} size={230} />
				</div>
				<div className="liveStick">
					<h3>R スティック</h3>
					<StickCanvas stick={1} size={230} />
				</div>
			</div>
			<div className="trigbars">
				<TriggerBar label="L2" value={bs.live.lt} />
				<TriggerBar label="R2" value={bs.live.rt} />
				<div className="note" style={{ textAlign: 'center' }}>
					灰 = 生値（キャリブレーション適用後） / 青 = 実際の出力
				</div>
			</div>
		</div>
	);
}
