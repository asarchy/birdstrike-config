import { useState } from 'react';
import { bs, useConfig } from './birdstrike';
import { LivePage } from './pages/LivePage';
import { ScopePage } from './pages/ScopePage';
import { StickPage } from './pages/StickPage';
import { SystemPage } from './pages/SystemPage';

type Page = 'live' | 'scope' | 'stick0' | 'stick1' | 'system';

const NAV: { page: Page; label: string; child?: boolean; group?: string }[] = [
	{ page: 'live', label: 'ライブビュー' },
	{ page: 'scope', label: '波形ビュー' },
	{ page: 'stick0', label: '左スティック', child: true, group: 'スティック' },
	{ page: 'stick1', label: '右スティック', child: true },
	{ page: 'system', label: 'システム', group: 'その他' },
];

export function App() {
	useConfig();
	const [page, setPage] = useState<Page>('live');

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
				<span className={`status ${bs.status.kind}`}>{bs.status.text}</span>
			</header>

			<div className="layout">
				<aside className="sidebar">
					{NAV.map((item) => (
						<div key={item.page} style={{ display: 'contents' }}>
							{item.group && <div className="group">{item.group}</div>}
							<button className={`${item.child ? 'child' : ''} ${page === item.page ? 'active' : ''}`}
								onClick={() => setPage(item.page)}>{item.label}</button>
						</div>
					))}
				</aside>
				<main>
					{page === 'live' && <LivePage />}
					{page === 'scope' && <ScopePage />}
					{page === 'stick0' && <StickPage stick={0} />}
					{page === 'stick1' && <StickPage stick={1} />}
					{page === 'system' && <SystemPage />}
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
