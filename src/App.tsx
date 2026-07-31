import { useState } from 'react';
import { bs, useConfig } from './birdstrike';
import { LivePage } from './pages/LivePage';
import { ScopePage } from './pages/ScopePage';
import { StickPage } from './pages/StickPage';
import { SystemPage } from './pages/SystemPage';
import { ControllerPage } from './pages/ControllerPage';
import { GatePage } from './pages/GatePage';

type Page = 'live' | 'scope' | 'stick0' | 'stick1' | 'system' | 'controller' | 'gate';

interface NavItem { page: Page; label: string; child?: boolean; group?: string; converterOnly?: boolean }

const NAV: NavItem[] = [
	{ page: 'live', label: 'ライブビュー' },
	{ page: 'scope', label: '波形ビュー' },
	// コンバーター (スティックが USB ホスト側のコントローラーから来る基板) の
	// ときだけ意味がある画面。パッドに対しては出さない
	{ page: 'controller', label: 'コントローラー', child: true, group: 'コンバーター', converterOnly: true },
	{ page: 'gate', label: 'ゲート較正', child: true, converterOnly: true },
	{ page: 'stick0', label: '左スティック', child: true, group: 'スティック' },
	{ page: 'stick1', label: '右スティック', child: true },
	{ page: 'system', label: 'システム', group: 'その他' },
];

export function App() {
	useConfig();
	const [page, setPage] = useState<Page>('live');
	const nav = NAV.filter((item) => !item.converterOnly || bs.isConverter);
	// 対象外の画面を開いたままコントローラーを持ち替えた場合に取り残されない
	const current = nav.some((i) => i.page === page) ? page : 'live';

	return (
		<>
			<header>
				<h1>Bird<span>Strike</span> Config Tool</h1>
				<button className="primary"
					onClick={() => (bs.connected ? bs.disconnect() : bs.connect())}>
					{bs.connected ? '切断' : '接続'}
				</button>
				<button disabled={!bs.connected} onClick={() => bs.reload()}>再読込</button>
				<button className="warn" disabled={!bs.connected} onClick={() => bs.save()}>
					本体に保存{bs.dirtyCount() > 0 ? ` (${bs.dirtyCount()})` : ''}
				</button>
				{bs.dirtyCount() > 0 && (
					<button disabled={!bs.connected} onClick={() => bs.discard()}>変更を破棄</button>
				)}
				{bs.connected && (
					<span className="board">{bs.isConverter ? 'Converter' : 'Pad'}</span>
				)}
				<span className={`status ${bs.status.kind}`}>{bs.status.text}</span>
			</header>

			<div className="layout">
				<aside className="sidebar">
					{nav.map((item) => (
						<div key={item.page} style={{ display: 'contents' }}>
							{item.group && <div className="group">{item.group}</div>}
							<button className={`${item.child ? 'child' : ''} ${current === item.page ? 'active' : ''}`}
								onClick={() => setPage(item.page)}>{item.label}</button>
						</div>
					))}
				</aside>
				<main>
					{current === 'live' && <LivePage />}
					{current === 'scope' && <ScopePage />}
					{current === 'controller' && <ControllerPage />}
					{current === 'gate' && <GatePage />}
					{current === 'stick0' && <StickPage stick={0} />}
					{current === 'stick1' && <StickPage stick={1} />}
					{current === 'system' && <SystemPage />}
				</main>
			</div>

			{!bs.connected && (
				<div className="overlay">
					<div className="box">
						<button className="primary" onClick={() => bs.connect()}>BirdStrike に接続</button>
						<p>
							Chrome / Edge で動作します。<br />
							どの入力モード（XInput / PS5 など）でも接続できます。
						</p>
					</div>
				</div>
			)}
		</>
	);
}
