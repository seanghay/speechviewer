import axios from "axios";
import clsx from "clsx";
import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import {
	FiArrowDown,
	FiArrowUp,
	FiRefreshCcw,
	FiSave,
	FiXCircle,
} from "react-icons/fi";
import { List, WindowScroller } from "react-virtualized";
import "react-virtualized/styles.css";
import TimeAgo from "timeago-react";

function SpeechListView({ items, setItems, scrollerRef }) {
	const currentPlayerRef = useRef(null);
	const listRef = useRef(null);

	useEffect(() => {
		const controller = new AbortController();
		(async () => {
			const res = await axios.get("/api/values");
			setItems(res.data);
		})();

		return () => controller.abort();
	}, [setItems]);

	const computeRowHeight = ({ index }) => 220;

	const rowRenderer = ({ key, style, index }) => {
		const item = items[index];

		const handleOnPlay = (e) => {
			const el = e.currentTarget;
			if (currentPlayerRef.current) {
				currentPlayerRef.current.pause();
			}
			currentPlayerRef.current = el;
			el.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
		};

		const onDrop = async () => {
			const res = await axios.post("/api/update", {
				...item,
				status: "drop",
			});

			toast.success("Saved");

			setItems(
				items.map((i) => {
					if (i.file !== item.file) return i;
					return {
						...i,
						...res.data,
					};
				}),
			);
		};

		const onSaveChanges = async () => {
			const res = await axios.post("/api/update", {
				...item,
				status: "normal",
			});

			toast.success("Saved");

			setItems(
				items.map((i) => {
					if (i.file !== item.file) return i;
					return {
						...i,
						...res.data,
					};
				}),
			);
		};

		const onTextChange = (e) => {
			setItems(
				items.map((i) => {
					if (i.file !== item.file) return i;
					return {
						...i,
						text: e.target.value,
					};
				}),
			);
		};

		let updatedAt = null;
		if (item.updated_at) {
			updatedAt = new Date(item.updated_at);
			updatedAt = new Date(
				updatedAt.getTime() - updatedAt.getTimezoneOffset() * 60000,
			);
		}

		return (
			<div key={item.file} style={style} className="pb-1">
				<div
					className={clsx(
						"mx-auto border-t max-w-5xl flex flex-col gap-2 h-full rounded-lg border-b border-x py-2 px-4",
						item.status === "normal"
							? "bg-blue-50 border-2"
							: item.status === "drop"
								? "bg-orange-50"
								: "bg-white",
					)}
				>
					{/* biome-ignore lint/a11y/useMediaCaption: ignored */}
					<audio
						onPlay={handleOnPlay}
						className="w-full"
						controls
						src={item.file}
					/>

					<textarea
						value={item.text}
						onChange={onTextChange}
						className="border flex-1 resize-none font-medium focus:outline focus:outline-offset-2 focus:outline-2 w-full rounded-lg px-3 py-2"
					/>

					<div className="flex items-center gap-1	">
						<button
							type="button"
							onClick={onSaveChanges}
							className="transition bg-white flex text-slate-500 hover:text-slate-600 items-center gap-1 hover:bg-slate-100 active:bg-slate-200 text-xs px-1.5 border rounded-lg py-1 font-medium"
						>
							<FiSave fontSize={16} />
							<span>Save</span>
						</button>

						<button
							type="button"
							onClick={onDrop}
							className="transition bg-white flex text-slate-500 hover:text-orange-600 items-center gap-1 hover:bg-slate-100 active:bg-slate-200 text-xs px-1.5 border rounded-lg py-1 font-medium"
						>
							<FiXCircle fontSize={16} />
							<span>Drop</span>
						</button>

						<span className="text-slate-400">{"\u30fb"}</span>
						<span className="font-medium text-slate-600 text-xs">
							{item.filename}
						</span>
						{updatedAt != null ? (
							<>
								<span className="text-slate-400">{"\u30fb"}</span>
								<span
									className={clsx(
										"text-xs font-medium",
										item.status === "normal"
											? "text-blue-700"
											: "text-orange-600",
									)}
								>
									<TimeAgo datetime={updatedAt} />
								</span>
							</>
						) : null}
					</div>
				</div>
			</div>
		);
	};
	if (items == null) return;

	return (
		<>
			<WindowScroller ref={scrollerRef}>
				{({ height, isScrolling, onChildScroll, scrollTop, width }) => (
					<List
						ref={listRef}
						autoHeight
						width={width}
						height={height}
						scrollToAlignment="center"
						rowCount={items.length}
						rowHeight={computeRowHeight}
						isScrolling={isScrolling}
						onScroll={onChildScroll}
						scrollTop={scrollTop}
						rowRenderer={rowRenderer}
					/>
				)}
			</WindowScroller>
		</>
	);
}

export default function SpeechEditor() {
	const [summary, setSummary] = useState(null);
	const [items, setItems] = useState(null);
	const scrollerRef = useRef(null);

	useEffect(() => {
		const controller = new AbortController();

		(async () => {
			const res = await axios.get("/api/summary");
			setSummary(res.data);
		})();

		return () => controller.abort();
	}, []);

	const onRefreshSummary = useCallback(async () => {
		const res = await axios.get("/api/summary");
		setSummary(res.data);
	}, []);

	const onJumptToLast = useCallback(() => {
		let idx = 0;
		for (const item of items) {
			if (item.created_at) {
				idx++;
				continue;
			}
			break;
		}

		idx = Math.max(0, idx - 1);
		if (idx === 0) return;
		window.scroll(0, scrollerRef.current._positionFromTop + 220 * idx);
	}, [items]);

	return (
		<>
			<div>
				<div className="py-4">
					<nav className="max-w-5xl mx-auto py-1 px-4">
						<h4 className="text-2xl text-blue-700 font-bold text-center">
							SpeechViewer
						</h4>
						<h4 className="text-sm text-slate-500 text-center">
							A quick audio dataset viewer
						</h4>
					</nav>
				</div>
				<div className="max-w-5xl mx-auto">
					<div className="border bg-white mb-2 px-4 py-3 flex flex-col items-center">
						<h4 className="font-medium text-xs text-slate-600 mb-1">Summary</h4>
						<div className="flex flex-wrap gap-1.5">
							<div className="rounded border px-2.5 text-center py-1">
								<h4 className="text-xs text-slate-500">Total</h4>
								<h4 className="font-medium text-md text-black">
									{summary?.total ?? "-"}
								</h4>
							</div>
							<div className="rounded border px-2.5 text-center py-1">
								<h4 className="text-xs text-slate-500">Saved</h4>
								<h4 className="font-medium text-md text-black">
									{summary?.normal ?? "-"}
								</h4>
							</div>

							<div className="rounded border px-2.5 text-center py-1">
								<h4 className="text-xs text-slate-500">Drop</h4>
								<h4 className="font-medium text-md text-black">
									{summary?.drop ?? "-"}
								</h4>
							</div>

							<div className="rounded border px-2.5 text-center py-1">
								<h4 className="text-xs text-slate-500">Remaining</h4>
								<h4 className="font-medium text-md text-black">
									{summary?.remaining ?? "-"}
								</h4>
							</div>
						</div>

						<div className="flex gap-1">
							<button
								onClick={onJumptToLast}
								type="button"
								className="hover:bg-slate-50 active:bg-slate-100  flex gap-1 items-center active:shadow-sm hover:shadow transition shadow-sm text-xs font-medium border px-2 py-0.5 rounded mt-2"
							>
								<span>Jump to Last</span>
								<FiArrowDown fontSize={14} />
							</button>

							<button
								onClick={onRefreshSummary}
								type="button"
								className="hover:bg-slate-50 active:bg-slate-100  flex gap-1 items-center active:shadow-sm hover:shadow transition shadow-sm text-xs font-medium border px-2 py-0.5 rounded mt-2"
							>
								<span>Refresh</span>
								<FiRefreshCcw fontSize={13} />
							</button>
						</div>
					</div>
				</div>

				<div className="pointer-events-none fixed z-10 bottom-0 right-0 left-0">
					<div className="max-w-5xl flex mx-auto justify-end p-4">
						<button
							onClick={() => window.scrollTo(0, 0)}
							className="pointer-events-auto rounded gap-1 flex text-xs font-medium bg-opacity-90 px-2.5 shadow-lg py-1 border bg-white items-center"
							type="button"
						>
							<span>Jump to Top</span>
							<FiArrowUp fontSize={16} />
						</button>
					</div>
				</div>

				<main>
					<SpeechListView
						scrollerRef={scrollerRef}
						items={items}
						setItems={setItems}
					/>
				</main>
			</div>
		</>
	);
}
