import React from 'react';
import { createPortal } from 'react-dom';

interface DesktopSpeedMenuProps {
    showSpeedMenu: boolean;
    playbackRate: number;
    speeds: number[];
    onSpeedChange: (speed: number) => void;
    onToggleSpeedMenu: () => void;
    onMouseEnter: () => void;
    onMouseLeave: () => void;
    containerRef: React.RefObject<HTMLDivElement | null>;
    isRotated?: boolean;
}

export function DesktopSpeedMenu({
    showSpeedMenu,
    playbackRate,
    speeds,
    onSpeedChange,
    onToggleSpeedMenu,
    onMouseEnter,
    onMouseLeave,
    containerRef,
    isRotated = false
}: DesktopSpeedMenuProps) {
    const buttonRef = React.useRef<HTMLButtonElement>(null);
    const menuRef = React.useRef<HTMLDivElement>(null);
    const [menuPosition, setMenuPosition] = React.useState({ top: 0, left: 0, maxHeight: 'none', openUpward: false, align: 'right' as 'left' | 'right' });

    const [isFullscreen, setIsFullscreen] = React.useState(false);

    React.useEffect(() => {
        const updateFullscreen = () => {
            // Check both native fullscreen and window fullscreen (CSS-based)
            const nativeFullscreen = !!document.fullscreenElement;
            const windowFullscreen = containerRef.current?.closest('.is-web-fullscreen') !== null;
            setIsFullscreen(nativeFullscreen || windowFullscreen);
        };
        document.addEventListener('fullscreenchange', updateFullscreen);
        // Also check periodically for window fullscreen changes (CSS class based)
        const interval = setInterval(updateFullscreen, 500);
        updateFullscreen();
        return () => {
            document.removeEventListener('fullscreenchange', updateFullscreen);
            clearInterval(interval);
        };
    }, [containerRef]);

    // Dual Positioning Strategy
    const calculateMenuPosition = React.useCallback(() => {
        if (!buttonRef.current || !containerRef.current) return;

        if (!isRotated) {
            // Normal Mode: Non-rotated
            // Use Viewport Coordinates but position relative to button (User Request: "Below button")
            // And use Body Portal to escape container clipping
            const buttonRect = buttonRef.current.getBoundingClientRect();
            const viewportHeight = window.innerHeight;
            const viewportWidth = window.innerWidth;

            const spaceBelow = viewportHeight - buttonRect.bottom - 10;
            const spaceAbove = buttonRect.top - 10;

            const estimatedMenuHeight = 250;
            const actualMenuHeight = menuRef.current?.offsetHeight || estimatedMenuHeight;

            const openUpward = spaceBelow < Math.min(actualMenuHeight, 200) && spaceAbove > spaceBelow;
            const maxHeight = openUpward
                ? Math.min(spaceAbove, actualMenuHeight)
                : Math.min(spaceBelow, viewportHeight * 0.7);

            // Smart Horizontal Alignment:
            // If button is on the left half of screen, align menu's left edge to button's left.
            // If button is on the right half of screen, align menu's right edge to button's right.
            const isLeftHalf = buttonRect.left < viewportWidth / 2;
            const align = isLeftHalf ? 'left' : 'right';

            let left = isLeftHalf ? buttonRect.left : buttonRect.right;

            // Boundary clamping
            if (isLeftHalf) {
                left = Math.max(left, 10);
            } else {
                left = Math.min(left, viewportWidth - 10);
            }

            setMenuPosition({
                top: openUpward
                    ? buttonRect.top - 10
                    : buttonRect.bottom + 10,
                left: left,
                maxHeight: `${maxHeight}px`,
                openUpward: openUpward,
                align: align
            });
        } else {
            // Rotated Mode: Fullscreen/Landscape forced
            // Use Container Coordinates (offset loop) and Portal to Container
            // This ensures rotation transforms apply correctly to the menu

            let top = 0;
            let left = 0;
            let el: HTMLElement | null = buttonRef.current;

            while (el && el !== containerRef.current) {
                top += el.offsetTop;
                left += el.offsetLeft;
                el = el.offsetParent as HTMLElement;
            }

            const buttonHeight = buttonRef.current.offsetHeight;
            const buttonWidth = buttonRef.current.offsetWidth;
            const containerHeight = containerRef.current.offsetHeight;

            const spaceBelow = containerHeight - (top + buttonHeight) - 20;
            const spaceAbove = top - 20;

            const estimatedMenuHeight = 250;
            const actualMenuHeight = menuRef.current?.offsetHeight || estimatedMenuHeight;

            const openUpward = spaceBelow < Math.min(actualMenuHeight, 200) && spaceAbove > spaceBelow;
            const maxHeight = openUpward
                ? Math.min(spaceAbove, actualMenuHeight)
                : Math.min(spaceBelow, containerHeight * 0.7);

            if (openUpward) {
                setMenuPosition({
                    top: top - 10,
                    left: left + buttonWidth,
                    maxHeight: `${maxHeight}px`,
                    openUpward: true,
                    align: 'right'
                });
            } else {
                setMenuPosition({
                    top: top + buttonHeight + 10,
                    left: left + buttonWidth,
                    maxHeight: `${maxHeight}px`,
                    openUpward: false,
                    align: 'right'
                });
            }
        }
    }, [containerRef, isRotated]);



    // Auto-close menu on scroll
    React.useEffect(() => {
        if (!showSpeedMenu) return;
        const handleScroll = () => {
            if (showSpeedMenu) {
                onToggleSpeedMenu();
            }
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, [showSpeedMenu, onToggleSpeedMenu]);

    React.useEffect(() => {
        if (showSpeedMenu) {
            calculateMenuPosition();
            const timer = setTimeout(calculateMenuPosition, 50);
            return () => clearTimeout(timer);
        }
    }, [showSpeedMenu, calculateMenuPosition, isRotated]);

    const handleToggle = () => {
        if (!showSpeedMenu) {
            calculateMenuPosition();
        }
        onToggleSpeedMenu();
    };

    const MenuContent = (
        <div
            ref={menuRef}
            className={`absolute z-[2147483647] bg-[var(--glass-bg)] backdrop-blur-[25px] saturate-[180%] rounded-[var(--radius-2xl)] border border-[var(--glass-border)] shadow-[var(--shadow-md)] p-1 sm:p-1.5 w-fit min-w-[3.5rem] sm:min-w-[4.5rem] animate-in fade-in zoom-in-95 duration-200 overflow-y-auto`}
            style={{
                top: isRotated
                    ? (menuPosition.openUpward ? 'auto' : `${menuPosition.top}px`)
                    : `${menuPosition.top}px`, // Absolute top for viewport mode
                bottom: isRotated
                    ? (menuPosition.openUpward ? `calc(100% - ${menuPosition.top}px + 10px)` : 'auto')
                    : 'auto', // We calculate Top, so Bottom is auto (or could use max-height)
                left: `${menuPosition.left}px`,
                transform: menuPosition.align === 'right' ? 'translateX(-100%)' : 'none',
                maxHeight: menuPosition.maxHeight,
            }}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            onClick={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
        >
            {speeds.map((speed) => (
                <button
                    key={speed}
                    onClick={() => onSpeedChange(speed)}
                    className={`w-full px-3 py-1 sm:px-4 sm:py-1.5 rounded-[var(--radius-2xl)] text-xs sm:text-sm font-medium transition-colors ${playbackRate === speed
                        ? 'bg-[var(--accent-color)] text-white'
                        : 'text-[var(--text-color)] hover:bg-[color-mix(in_srgb,var(--accent-color)_15%,transparent)]'
                        }`}
                >
                    {speed}x
                </button>
            ))}
        </div>
    );

    return (
        <div className="relative">
            <button
                ref={buttonRef}
                onClick={handleToggle}
                onMouseEnter={onMouseEnter}
                onMouseLeave={onMouseLeave}
                className="group flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-sm transition-all duration-300 hover:scale-110 active:scale-95 text-white/90 font-medium text-xs sm:text-sm"
                aria-label="播放速度"
            >
                {playbackRate}x
            </button>

            {/* Speed Menu (Portal) - Portal to container to inherit rotation but avoid overflow clipping if container has it? 
                Actually, the container usually has overflow-hidden.
                If we portal to containerRef, it is inside the container div.
                If the container div has overflow-hidden, the menu will be clipped.
                BUT DesktopVideoPlayer structure:
                <div ref={containerRef} ...> (relative, no overflow hidden?)
                  <div className="absolute inset-0 overflow-hidden ..."> (video wrapper)
                  <DesktopOverlayWrapper ...>
                So containerRef itself (outer wrapper) seems to NOT have overflow-hidden in my memory?
                Checking DesktopVideoPlayer.tsx:
                className={`kvideo-container relative aspect-video ...`}
                It does NOT have overflow-hidden. The inner div does.
                So portaling to containerRef is SAFE and CORRECT.
            */}
            {/* Speed Menu (Portal) */}
            {showSpeedMenu && typeof document !== 'undefined' && createPortal(MenuContent, (isRotated && containerRef.current) ? containerRef.current : document.body)}
        </div>
    );
}
