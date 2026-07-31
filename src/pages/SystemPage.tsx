import { useState } from 'react';
import { bs, useConfig, useLive, GP, INPUT_MODES } from '../birdstrike';
import { SliderRow, NumberRow, CheckRow } from '../components/Controls';

function InputModeCard() {
	useConfig();
	const [sel, setSel] = useState<number | null>(null);
	const current = bs.inputMode;
	const value = sel ?? current;
	const label = INPUT_MODES.find(([v]) => v === current)?.[1] ?? `不明 (${current})`;
	return (
		<div className="card">
			<h3>入力モード</h3>
			<div className="row">
				<label>現在: {label}</label>
				<select value={value} onChange={(e) => setSel(+e.target.value)}>
					{INPUT_MODES.map(([v, text]) => <option key={v} value={v}>{text}</option>)}
				</select>
				<button className="warn" disabled={value === current}
					onClick={() => bs.setInputMode(value)}>
					適用して再起動
				</button>
			</div>
			<div className="note">
				適用すると設定を保存して再起動します（USBが一度切断され、新しいモードで再列挙されます）。
				再列挙後に「接続」し直せばツールを続けて使えます。
				<b>例外: P5General (PS5) モードはPS5互換のため設定チャンネルを持たず、ツールから接続できません。</b>
				戻すには Share+Options+R1 でwebconfigに入るか、起動時ボタンコンボを使ってください。
				スティック設定は全モード共通なので、他モードで調整→保存→P5Generalで使用、が基本フローです。
			</div>
		</div>
	);
}

// Share+Options+ボタン長押しのモード切替コンボ割り当て (ch v3+)
function ModeComboCard() {
	useConfig();
	if (bs.protocolVersion < 3) return null;
	const rows: [string, number][] = [
		['× (クロス)', GP.comboModeB1],
		['〇 (サークル)', GP.comboModeB2],
		['□ (スクエア)', GP.comboModeB3],
		['△ (トライアングル)', GP.comboModeB4],
	];
	return (
		<div className="card">
			<h3>モード切替コンボ（Share + Options + ボタン 長押し）</h3>
			{rows.map(([label, id]) => (
				<div className="row" key={id}>
					<label>{label}</label>
					<select value={bs.getVal(2, id)}
						onChange={(e) => bs.setParam(2, id, 0, +e.target.value)}>
						<option value={-1}>無効</option>
						{INPUT_MODES.map(([v, text]) => <option key={v} value={v}>{text}</option>)}
					</select>
				</div>
			))}
			<div className="note">
				ボタンを離した状態から Share+Options+対象ボタン を4秒間押し続けると、
				割り当てたモードを保存して再起動します。割り当て変更後は「本体に保存」を忘れずに。
			</div>
		</div>
	);
}

function AdsDiagCard() {
	useLive();
	const d = bs.live.diag;
	const yn = (v: boolean) => (v ? 'OK' : 'NG');
	return (
		<div className="card">
			<h3>ADC 診断 (ADS8332)</h3>
			{!d.present ? (
				<div className="note">診断情報なし（ファームが古いか、アドオン未初期化）</div>
			) : (
				<div className="vals">
					{`link:${yn(d.linkOk)}  scan:${yn(d.scanCompleted)}  rawValid:${yn(bs.live.valid)}\n`}
					{`CS:GPIO${d.probedCs}  SPI mode:${d.probedMode}  hwCS:${d.hwCs ? 1 : 0}  stitch:${d.stitch ? 1 : 0}\n`}
					{`ch: ${bs.live.ch.join(' ')}`}
				</div>
			)}
		</div>
	);
}

function LightbarColorRow() {
	useConfig();
	const value = '#' + (bs.getVal(2, GP.lightbarColor) & 0xffffff).toString(16).padStart(6, '0');
	return (
		<div className="row">
			<label>色（待機時）</label>
			<input type="color" value={value}
				onChange={(e) => bs.setParam(2, GP.lightbarColor, 0, parseInt(e.target.value.slice(1), 16))} />
		</div>
	);
}

export function SystemPage() {
	return (
		<div>
			<InputModeCard />
			<ModeComboCard />
			{/* ライトバー・アナログボタン・ADC はパッド基板の実装。コンバーターには
			    無いので出さない（設定できてしまうと誤解を招く） */}
			{!bs.isConverter && <>
			<div className="card">
				<h3>ライトバー</h3>
				<CheckRow t={2} id={GP.lightbarEnabled} label="有効" />
				<SliderRow t={2} id={GP.lightbarBrightness} label="輝度" min={0} max={255} />
				<LightbarColorRow />
			</div>
			<div className="card">
				<h3>アナログボタン閾値</h3>
				<NumberRow t={2} id={GP.psThreshold} label="PSボタン閾値 (raw)" min={0} max={65535} />
				<CheckRow t={2} id={GP.psActiveHigh} label="PSボタン アクティブHigh" />
				<NumberRow t={2} id={GP.l3Threshold} label="L3閾値 (raw)" min={0} max={65535} />
				<CheckRow t={2} id={GP.l3ActiveHigh} label="L3 アクティブHigh" />
				<NumberRow t={2} id={GP.r3Threshold} label="R3閾値 (raw)" min={0} max={65535} />
				<CheckRow t={2} id={GP.r3ActiveHigh} label="R3 アクティブHigh" />
			</div>
			<AdsDiagCard />
			</>}
			<div className="card">
				<h3>メンテナンス</h3>
				<div className="row">
					<label>再起動</label>
					<button onClick={() => bs.reboot(0)}>通常</button>
					<button onClick={() => bs.reboot(2)}>webconfig</button>
					<button className="warn" onClick={() => bs.reboot(1)}>BOOTSEL (UF2書き込み)</button>
				</div>
				<div className="note">
					BOOTSEL では RPI-RP2 ドライブとしてマウントされ、UF2 をドロップしてファームウェアを更新できます。
				</div>
			</div>
		</div>
	);
}
