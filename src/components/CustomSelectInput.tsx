import React, { useContext } from "react";
import SelectInput from "ink-select-input";
import { FocusContext } from "../contexts/FocusContext";

const CustomSelectInput: React.FC<{
  id: string;
  items: any[];
  onSelect: (item: any) => void;
  limit?: number;
}> = ({ id, items, onSelect, limit = 10 }) => {
  const { focusedId } = useContext(FocusContext);
  const isFocused = focusedId === id;

  return (
    <SelectInput 
      items={items} 
      onSelect={onSelect} 
      isFocused={isFocused} 
      limit={limit}
    />
  );
};

export default CustomSelectInput;
