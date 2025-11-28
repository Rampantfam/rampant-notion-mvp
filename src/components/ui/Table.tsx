export function Table({ children }: { children: React.ReactNode }) {
  return <div className="overflow-x-auto"><table className="w-full text-sm">{children}</table></div>;
}

export function THead({ children }: { children: React.ReactNode }) {
  return <thead className="text-muted border-b border-default">{children}</thead>;
}

export function TR({ children }: { children: React.ReactNode }) {
  return <tr className="hover:bg-gray-50">{children}</tr>;
}

export function TH({ children }: { children: React.ReactNode }) {
  return <th className="py-3 px-3 text-left font-medium">{children}</th>;
}

export function TD({ children }: { children: React.ReactNode }) {
  return <td className="py-3 px-3">{children}</td>;
}

