interface FieldErrorProps {
  id: string;
  messages?: readonly string[];
}

export default function FieldError({ id, messages }: FieldErrorProps) {
  if (!messages?.length) return null;

  return (
    <ul id={id} className="mt-1 list-disc space-y-1 pl-5 text-sm wrap-anywhere text-red-700">
      {Array.from(new Set(messages), (message) => <li key={message}>{message}</li>)}
    </ul>
  );
}
