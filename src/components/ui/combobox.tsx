"use client";

import * as React from "react";
import * as Popover from "@radix-ui/react-popover";
import { Input } from "./input";
import { TrashIcon } from "@radix-ui/react-icons";

export interface ComboboxProps<T> {
  /** List of all available items */
  items: T[];
  /** Currently selected items (controlled) */
  selectedItems: T[];
  /** Callback fired when the selection changes */
  onChange: (selected: T[]) => void;
  /** Converts an item to its unique identifier (used for keys and equality) */
  itemToIdentifier: (item: T) => string;
  /** Converts an item to its display string (used for filtering and presentation) */
  itemToDisplay: (item: T) => string;
  /** Placeholder text for the input */
  placeholder?: string;
  /** Optional custom render function for each item in the list */
  renderItem?: (item: T) => React.ReactNode;
}

/**
 * A reusable, controlled combobox (multi-select) component.
 * The combobox container shows selected items as removable bubbles.
 * Clicking the container opens a popover with a search bar (affixed to the top)
 * and a list of filtered items.
 */
export function Combobox<T>({
  items,
  selectedItems,
  onChange,
  itemToIdentifier,
  itemToDisplay,
  placeholder = "Select options...",
  renderItem,
}: ComboboxProps<T>) {
  // The freeform query the user types in the search bar (inside the popover)
  const [query, setQuery] = React.useState("");
  // Whether the popover (dropdown) is open.
  const [isOpen, setIsOpen] = React.useState(false);

  // Filter available items based on the query (using the display value)
  const filteredItems = query
    ? items.filter((item) =>
        itemToDisplay(item).toLowerCase().includes(query.toLowerCase())
      )
    : items;

  // Add an item if it's not already selected.
  const handleSelect = (item: T) => {
    if (
      !selectedItems.some(
        (selected) => itemToIdentifier(selected) === itemToIdentifier(item)
      )
    ) {
      onChange([...selectedItems, item]);
    }
  };

  // Remove an item from the selection.
  const handleRemove = (item: T) => {
    onChange(
      selectedItems.filter(
        (selected) => itemToIdentifier(selected) !== itemToIdentifier(item)
      )
    );
  };

  return (
    <div className="w-full">
      <Popover.Root open={isOpen} onOpenChange={setIsOpen}>
        {/* The combobox "input" container: shows selected items and placeholder */}
        <Popover.Trigger asChild>
          <div
            className="w-full border border-gray-300 rounded-md px-2 py-1 flex flex-wrap items-center min-h-[40px] cursor-text"
            // Clicking the container opens the popover.
            onClick={() => setIsOpen(true)}
          >
            {selectedItems.length > 0 ? (
              selectedItems.map((item) => (
                <div
                  key={itemToIdentifier(item)}
                  className="flex items-center bg-gray-200 text-gray-800 rounded-full px-2 py-1 text-sm mr-1 mb-1"
                >
                  <span>{itemToDisplay(item)}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent popover from closing when removing a tag.
                      handleRemove(item);
                    }}
                    className="ml-1 text-gray-600 hover:text-gray-900 focus:outline-none"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              ))
            ) : (
              <span className="text-gray-500">{placeholder}</span>
            )}
          </div>
        </Popover.Trigger>

        {/* The popover content with the search bar and filtered list */}
        <Popover.Portal>
          <Popover.Content
            side="bottom"
            align="start"
            sideOffset={4}
            className="w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto p-2"
          >
            {/* The search bar at the top */}
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search..."
              className="w-full mb-2"
              autoFocus
            />
            {filteredItems.length === 0 ? (
              <div className="p-2 text-gray-500">No results found</div>
            ) : (
              <ul>
                {filteredItems.map((item) => (
                  <li
                    key={itemToIdentifier(item)}
                    onClick={() => {
                      handleSelect(item);
                      setQuery("");
                    }}
                    className="w-full cursor-pointer p-2 hover:bg-gray-100 rounded-md"
                  >
                    {renderItem ? renderItem(item) : itemToDisplay(item)}
                  </li>
                ))}
              </ul>
            )}
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </div>
  );
}
