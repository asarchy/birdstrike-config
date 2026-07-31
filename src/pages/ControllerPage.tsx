// コンバーター専用: いまつないでいるコントローラーの素性を見る画面。
// 動かないときに「何が起きていないか」を切り分けられることが目的。
import { bs, useLive, useConfig } from '../birdstrike';

const hex4 = (v: number) => v.toString(16).toUpperCase().padStart(4, '0');

// ファーム側 GamepadUSBHostListener が付ける名前
const DRIVERS: Record<string, string> = {
	ds4: 'DualShock 4',
	dualsense: 'DualSense',
	switchpro: 'Switch Pro',
	xbox360: 'Xbox 360 (XInput)',
	stadia: 'Stadia',
	drivingforce: 'Driving Force',
	ultrastik360: 'Ultrastik 360',
	generic: '汎用HID',
	'auth-dongle': '認証ドングル',
	busy: '—',
	none: '—',
};

export function ControllerPage() {
	useLive();
	useConfig();
	const h = bs.host;

	// 分からないことを断定しない: それぞれ別の失敗として出し分ける
	let verdict: { kind: 'ok' | 'warn' | 'err'; title: string; body: string };
	if (!h.seen) {
		verdict = {
			kind: 'err',
			title: 'コントローラーが見えていません',
			body: 'USB スタックまで届いていません。入力ポートに挿さっているか、ハブの給電（500mA を 3 ポートで共有）を確認してください。',
		};
	} else if (h.driver === 'auth-dongle') {
		verdict = {
			kind: 'ok',
			title: '認証ドングルとして認識',
			body: '入力用ではなく PS4/PS5 の認証に使われます。操作用のコントローラーは別のポートに挿してください。',
		};
	} else if (h.driver === 'busy') {
		verdict = {
			kind: 'warn',
			title: '別のコントローラーが使用中',
			body: '同時に扱えるのは 1 台だけです。使わない方を抜いてください。',
		};
	} else if (h.driver === 'none') {
		verdict = h.hid
			? {
				kind: 'err',
				title: '対応していないコントローラー',
				body: 'Joystick / Gamepad として名乗っていないか、X/Y 軸が見つかりませんでした。',
			}
			: {
				kind: 'err',
				title: 'XInput として認識できません',
				body: 'ベンダークラス（XInput 系）で来ていますが XBOX360 と判定されませんでした。Xbox One 系は未対応です。',
			};
	} else {
		verdict = {
			kind: 'ok',
			title: `${DRIVERS[h.driver] ?? h.driver} として動作中`,
			body: 'このコントローラーの入力に整形がかかります。ゲート較正をすると操作感を他の機種と揃えられます。',
		};
	}

	return (
		<>
			<h2>コントローラー</h2>

			<div className={`card verdict ${verdict.kind}`}>
				<strong>{verdict.title}</strong>
				<p className="note">{verdict.body}</p>
			</div>

			<div className="card">
				<h3>接続情報</h3>
				<table className="kv">
					<tbody>
						<tr><th>USB スタックが認識</th><td>{h.seen ? 'はい' : 'いいえ'}</td></tr>
						<tr><th>接続経路</th><td>{h.seen ? (h.hid ? 'HID' : 'XInput (ベンダークラス)') : '—'}</td></tr>
						<tr><th>VID / PID</th>
							<td className="mono">{h.seen ? `${hex4(h.vid)} : ${hex4(h.pid)}` : '—'}</td></tr>
						<tr><th>ドライバ</th>
							<td>{DRIVERS[h.driver] ?? h.driver} <span className="mono dim">({h.driver})</span></td></tr>
					</tbody>
				</table>
			</div>

			<div className="card">
				<h3>整形前の生値</h3>
				<p className="note">
					コントローラーが送ってきたそのままの値です。整形の効果を見るときは「ライブビュー」と見比べてください。
				</p>
				<table className="kv">
					<tbody>
						<tr><th>左スティック</th><td className="mono">{h.raw.lx} , {h.raw.ly}</td></tr>
						<tr><th>右スティック</th><td className="mono">{h.raw.rx} , {h.raw.ry}</td></tr>
					</tbody>
				</table>
			</div>
		</>
	);
}
