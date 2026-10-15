import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

function formatPrice(amount, currency = "INR") {
  if (typeof amount !== "number" || !Number.isFinite(amount)) return null;

  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
      minimumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString("en-IN")}`;
  }
}

function PriceDisplay({ option, compact = false }) {
  const currentPrice = formatPrice(option?.currentPrice, option?.currency);
  const originalPrice = formatPrice(option?.originalPrice, option?.currency);

  if (!currentPrice) return null;

  return (
    <span
      className={`gp-select-price${compact ? " gp-select-price-compact" : ""}`}
      aria-label={
        originalPrice
          ? `Current price ${currentPrice}, original price ${originalPrice}`
          : `Price ${currentPrice}`
      }
    >
      {originalPrice && (
        <span className="gp-select-original-price">{originalPrice}</span>
      )}
      <span className="gp-select-current-price">{currentPrice}</span>
    </span>
  );
}

export default function Select({
  value,
  onChange,
  options = [],
  placeholder = "Select an option",
  disabled = false,
  ariaLabel,
  name,
}) {
  const generatedId = useId();
  const listboxId = `${generatedId}-listbox`;
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const optionRefs = useRef([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [position, setPosition] = useState(null);

  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => String(option.value) === String(value)),
  );
  const selectedOption = options.find(
    (option) => String(option.value) === String(value),
  );

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const gap = 6;
    const viewportPadding = 10;
    const spaceBelow = window.innerHeight - rect.bottom - viewportPadding;
    const spaceAbove = rect.top - viewportPadding;
    const placement =
      spaceBelow < 190 && spaceAbove > spaceBelow ? "top" : "bottom";
    const availableHeight = Math.max(
      100,
      Math.min(260, placement === "bottom" ? spaceBelow : spaceAbove),
    );
    setPosition({
      left: Math.max(8, rect.left),
      width: Math.min(rect.width, window.innerWidth - 16),
      top: placement === "bottom" ? rect.bottom + gap : rect.top - gap,
      maxHeight: availableHeight,
      placement,
    });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
    const handleViewportChange = () => updatePosition();
    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);
    return () => {
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event) => {
      if (rootRef.current?.contains(event.target)) return;
      if (
        event.target instanceof Node &&
        document.getElementById(listboxId)?.contains(event.target)
      )
        return;
      setOpen(false);
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, listboxId]);

  useEffect(() => {
    if (open) {
      optionRefs.current[activeIndex]?.focus();
    }
  }, [open, activeIndex]);

  function openMenu(index = selectedIndex) {
    if (disabled || !options.length) return;
    setActiveIndex(Math.min(Math.max(index, 0), options.length - 1));
    setOpen(true);
  }

  function chooseOption(option) {
    onChange(option.value);
    setOpen(false);
    triggerRef.current?.focus();
  }

  function handleOptionKeyDown(event, index) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index + 1) % options.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index - 1 + options.length) % options.length);
    } else if (event.key === "Home") {
      event.preventDefault();
      setActiveIndex(0);
    } else if (event.key === "End") {
      event.preventDefault();
      setActiveIndex(options.length - 1);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      chooseOption(options[index]);
    } else if (event.key === "Tab") {
      setOpen(false);
    }
  }

  return (
    <div ref={rootRef} className="gp-select-root">
      {name && <input type="hidden" name={name} value={value ?? ""} />}
      <button
        ref={triggerRef}
        type="button"
        className="gp-select-trigger"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            openMenu(
              event.key === "ArrowDown" ? selectedIndex : selectedIndex - 1,
            );
          } else if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            if (!open) openMenu();
          } else if (event.key === "Escape") {
            setOpen(false);
          }
        }}
      >
        <span className="gp-select-trigger-content">
          <span
            className={
              selectedOption ? "gp-select-value" : "gp-select-placeholder"
            }
          >
            {selectedOption?.label ?? placeholder}
          </span>
          {selectedOption && <PriceDisplay option={selectedOption} compact />}
        </span>
        <svg
          className={`gp-select-chevron${open ? " is-open" : ""}`}
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="m6 9 6 6 6-6"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open &&
        position &&
        createPortal(
          <div
            id={listboxId}
            role="listbox"
            aria-label={ariaLabel || "Options"}
            className="gp-select-menu flex flex-col gap-1 p-1.5"
            style={{
              position: "fixed",
              left: position.left,
              width: position.width,
              maxHeight: position.maxHeight,
              ...(position.placement === "bottom"
                ? { top: position.top }
                : { bottom: window.innerHeight - position.top }),
            }}
          >
            {options.map((option, index) => {
              const selected = String(option.value) === String(value);
              const active = index === activeIndex;
              return (
                <button
                  key={String(option.value)}
                  ref={(element) => {
                    optionRefs.current[index] = element;
                  }}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  tabIndex={active ? 0 : -1}
                  className={`gp-select-option${selected ? " is-selected" : ""}${active ? " is-active" : ""}`}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => chooseOption(option)}
                  onKeyDown={(event) => handleOptionKeyDown(event, index)}
                >
                  <span className="gp-select-option-main">
                    <span className="gp-select-option-label">
                      {option.label}
                    </span>
                    <PriceDisplay option={option} />
                  </span>
                  {selected && (
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path
                        d="m5 12 4 4L19 6"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>,
          document.body,
        )}
    </div>
  );
}
