import { useEffect, useRef, useState } from 'react';
import {
  findRoom,
  floorPlan,
  searchRooms,
  type RoomResult,
} from '../shared/model';

export function CampusMap() {
  const [floorId, setFloorId] = useState(floorPlan.floors[0].id);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<RoomResult | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const mapRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLButtonElement>(null);
  const floor = floorPlan.floors.find((item) => item.id === floorId)!;
  const suggestions = searchRooms(query);
  const showSuggestions =
    searchOpen &&
    query.trim().length > 0 &&
    !(selected && query === selected.room.name);

  useEffect(() => {
    const map = mapRef.current;
    const room = selectedRef.current;
    if (!map || !room) return;
    map.scrollTo({
      left: room.offsetLeft + room.offsetWidth / 2 - map.clientWidth / 2,
      behavior: 'smooth',
    });
  }, [selected, floorId]);

  function choose(result: RoomResult) {
    setFloorId(result.floor.id);
    setSelected(result);
    setQuery(result.room.name);
    setSearchOpen(false);
    setActiveIndex(0);
  }

  return (
    <section className="panel campus-panel">
      <h2>構内案内</h2>
      <p className="notice">{floorPlan.notice}</p>
      <div className="campus-search">
        <label htmlFor="room-search">部屋を探す</label>
        <div className="campus-search-input">
          <input
            id="room-search"
            type="search"
            autoComplete="off"
            placeholder="教室名・部屋番号で検索"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={showSuggestions}
            aria-controls="room-suggestions"
            aria-activedescendant={
              showSuggestions && suggestions.length
                ? `room-suggestion-${activeIndex}`
                : undefined
            }
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setSelected(null);
              setSearchOpen(true);
              setActiveIndex(0);
            }}
            onFocus={() => setSearchOpen(true)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                setSearchOpen(false);
              } else if (event.key === 'ArrowDown' && suggestions.length) {
                event.preventDefault();
                setSearchOpen(true);
                setActiveIndex((index) => (index + 1) % suggestions.length);
              } else if (event.key === 'ArrowUp' && suggestions.length) {
                event.preventDefault();
                setSearchOpen(true);
                setActiveIndex(
                  (index) =>
                    (index - 1 + suggestions.length) % suggestions.length,
                );
              } else if (
                event.key === 'Enter' &&
                showSuggestions &&
                suggestions.length
              ) {
                event.preventDefault();
                choose(suggestions[activeIndex]);
              }
            }}
            onBlur={(event) => {
              if (
                !event.currentTarget.parentElement?.contains(
                  event.relatedTarget,
                )
              )
                setSearchOpen(false);
            }}
          />
          {query && (
            <button
              type="button"
              className="campus-clear"
              aria-label="検索を解除"
              onClick={() => {
                setQuery('');
                setSelected(null);
                setSearchOpen(false);
              }}
            >
              ×
            </button>
          )}
          {showSuggestions && (
            <ul
              id="room-suggestions"
              className="room-suggestions"
              role="listbox"
            >
              {suggestions.length ? (
                suggestions.map((result, index) => (
                  <li key={`${result.floor.id}-${result.room.id}`}>
                    <button
                      id={`room-suggestion-${index}`}
                      role="option"
                      aria-selected={index === activeIndex}
                      type="button"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => choose(result)}
                    >
                      <span>{result.room.name}</span>
                      <small>{result.floor.label}</small>
                    </button>
                  </li>
                ))
              ) : (
                <li className="room-no-results">該当する部屋がありません</li>
              )}
            </ul>
          )}
        </div>
      </div>

      <div className="floor-tabs" role="group" aria-label="階を選ぶ">
        {floorPlan.floors.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={item.id === floorId}
            className={item.id === floorId ? 'active' : ''}
            onClick={() => {
              setFloorId(item.id);
              setSelected(null);
              setQuery('');
              setSearchOpen(false);
            }}
          >
            {item.label}
          </button>
        ))}
      </div>

      <p className="campus-hint">横にスクロールして各部屋を確認できます。</p>
      <div className="floor-map-scroll" ref={mapRef}>
        <div
          className="floor-map"
          role="group"
          aria-label={`${floor.label}の仮配置図`}
        >
          <div className="floor-corridor">廊下（仮）</div>
          {floor.rooms.map((room) => {
            const isSelected =
              selected?.floor.id === floor.id && selected.room.id === room.id;
            return (
              <button
                key={room.id}
                type="button"
                ref={isSelected ? selectedRef : undefined}
                className={`map-room${isSelected ? ' is-selected' : ''}`}
                style={{
                  left: `${room.x}%`,
                  top: `${room.y}%`,
                  width: `${room.w}%`,
                  height: `${room.h}%`,
                }}
                aria-pressed={isSelected}
                onClick={() => {
                  const result = findRoom(floor.id, room.id);
                  if (result) choose(result);
                }}
              >
                {room.name}
              </button>
            );
          })}
        </div>
      </div>
      <p className="campus-selection" aria-live="polite">
        {selected
          ? `選択中：${selected.floor.label}・${selected.room.name}`
          : `${floor.label}の部屋を選択できます`}
      </p>
    </section>
  );
}
