import { TextInput, TextInputProps } from "react-native";

export default function Input(props: TextInputProps) {
  const { className, ...rest } = props;

  return (
    <TextInput
      {...rest}
      className={`p-0 flex-1 ml-3 text-gray-900 ${className}`}
    />
  );
}
