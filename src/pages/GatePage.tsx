// コンバーター専用: スティックのゲート形状を実測して正規化する画面。
//
// スティックのゲートは真円ではなく角張っていて、その角張り方は機種ごとに違う。
// そのままだと「同じだけ倒した」ときの出力が方向と機種で変わってしまう。実測
// した半径で割ると、どの方向でも・どの機種でも「いっぱいまで倒す = 1.0」に
// 揃い、そこから先の角張り具合は対角スケールで好きに作れる。
import { useState } from 'react';
import { bs, useLive, useConfig, GATE_BINS } from '../birdstrike';
import { GateCanvas } from '../components/GateCanvas';

type Phase = 'idle' | 'center' | 'sweep' | 'done';

export function GatePage() {
	useLive();
	useConfig();
	const [stick, setStick] = useState<0 | 1>(0);
	const h = bs.host;

	// 中心が取れると center に値が入る。それが手を離す工程の終わり
	const centered = h.center[0] !== 0 || h.center[1] !== 0;
	const phase: Phase = !h.calActive
		? (h.coverage >= 100 ? 'done' : 'idle')
		: (centered ? 'sweep' : 'center');

	const measured = h.radius.filter((r) => r > 0).length;
	const canStart = h.seen && h.driver !== 'none' && h.driver !== 'busy' && h.driver !== 'auth-dongle';

	return (
		<>
			<h2>ゲート較正</h2>

			<div className="card">
				<p className="note">
					スティックのゲートは真円ではなく角張っていて、その形は機種ごとに違います。実測した半径で
					割ることで、<strong>どの方向でも・どの機種でも「いっぱいまで倒す = 最大出力」</strong>に揃います。
					角張った出力が欲しい場合は、そのうえで各スティックの<strong>対角スケール</strong>で作ってください。
					較正は <span className="mono">VID:PID</span> ごとに保存され、挿し替えるだけで切り替わります。
				</p>
			</div>

			{!canStart && (
				<div className="card verdict err">
					<strong>較正できるコントローラーがつながっていません</strong>
					<p className="note">「コントローラー」タブで状態を確認してください。</p>
				</div>
			)}

			<div className="gateWrap">
				<div className="gateSide">
					<GateCanvas stick={stick} size={320} />
					<div className="gateLegend">
						<span><i className="sw orange" />実測ゲート</span>
						<span><i className="sw dash" />単位円</span>
						<span><i className="sw blue" />現在位置</span>
						<span><i className="sw red" />未測定</span>
					</div>
				</div>

				<div className="gateContent">
					<div className="card">
						<h3>対象</h3>
						<div className="row">
							<label>スティック</label>
							<select value={stick} disabled={h.calActive}
								onChange={(e) => setStick(+e.target.value as 0 | 1)}>
								<option value={0}>左スティック</option>
								<option value={1}>右スティック</option>
							</select>
						</div>
						<div className="row">
							<label>コントローラー</label>
							<span className="mono">
								{h.seen
									? `${h.vid.toString(16).toUpperCase().padStart(4, '0')}:${h.pid.toString(16).toUpperCase().padStart(4, '0')}`
									: '—'}
							</span>
						</div>
					</div>

					<div className="card">
						<h3>手順</h3>
						<ol className="steps">
							<li className={phase === 'center' ? 'now' : centered || phase === 'done' ? 'done' : ''}>
								<strong>スティックから手を離す</strong>
								<span>中心とノイズを測ります（一瞬です）</span>
							</li>
							<li className={phase === 'sweep' ? 'now' : phase === 'done' ? 'done' : ''}>
								<strong>ゲートに沿ってゆっくり 2〜3 周</strong>
								<span>外周に押し当てたまま、ゆっくり回してください</span>
							</li>
							<li className={phase === 'done' ? 'now' : ''}>
								<strong>保存</strong>
								<span>全方向が埋まると保存できます</span>
							</li>
						</ol>

						<div className="progress">
							<div className="bar"><div className="fill" style={{ width: `${h.coverage}%` }} /></div>
							<span className="mono">{measured} / {GATE_BINS} 方向</span>
						</div>

						<div className="btnRow">
							{!h.calActive ? (
								<button className="primary" disabled={!canStart}
									onClick={() => bs.calStart(stick)}>
									{h.coverage > 0 ? '測り直す' : '較正を開始'}
								</button>
							) : (
								<>
									<button className="warn" disabled={h.coverage < 100}
										onClick={() => bs.calSave()}>本体に保存</button>
									<button onClick={() => bs.calAbort()}>中止</button>
								</>
							)}
						</div>

						{h.calActive && h.coverage < 100 && (
							<p className="note">
								赤く残っている扇の方向がまだ測れていません。その向きにスティックを倒して外周をなぞってください。
							</p>
						)}
					</div>

					<div className="card">
						<h3>測定値</h3>
						<p className="note">
							中心 <span className="mono">{h.center[0]} , {h.center[1]}</span>
							{!centered && '（未測定）'}
						</p>
						<table className="kv gateTable">
							<tbody>
								{Array.from({ length: GATE_BINS / 2 }, (_, i) => (
									<tr key={i}>
										<th>{(i * 360 / GATE_BINS).toFixed(1)}°</th>
										<td className="mono">{h.radius[i] ? (h.radius[i] / 1000).toFixed(3) : '—'}</td>
										<th>{((i + GATE_BINS / 2) * 360 / GATE_BINS).toFixed(1)}°</th>
										<td className="mono">
											{h.radius[i + GATE_BINS / 2] ? (h.radius[i + GATE_BINS / 2] / 1000).toFixed(3) : '—'}
										</td>
									</tr>
								))}
							</tbody>
						</table>
						<p className="note">
							1.000 が公称フルスケールです。角張ったスティックほど対角（45°方向）が
							1.000 を超え、最大 1.414 まで出ます。
						</p>
					</div>
				</div>
			</div>
		</>
	);
}
