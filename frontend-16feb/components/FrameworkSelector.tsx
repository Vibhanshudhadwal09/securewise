'use client';
 
export type FrameworkName = 'iso27001' | 'soc2';
 
const FRAMEWORKS: { id: FrameworkName; name: string }[] = [
  { id: 'iso27001', name: 'ISO 27001:2022' },
  { id: 'soc2', name: 'SOC 2 Type II' },
];
 
interface FrameworkSelectorProps {
  selected: FrameworkName;
  onChange: (framework: FrameworkName) => void;
}
 
export default function FrameworkSelector({ selected, onChange }: FrameworkSelectorProps) {
  return (
    <div className="flex gap-2 flex-wrap">
      {FRAMEWORKS.map((fw) => (
        <button
          key={fw.id}
          onClick={() => onChange(fw.id)}
          className={`px-4 py-2 rounded-lg border-2 transition-all font-medium ${
            selected === fw.id
              ? 'bg-blue-600 text-white border-blue-600 shadow-lg'
              : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400 hover:shadow-md'
          }`}
        >
          {fw.name}
        </button>
      ))}
    </div>
  );
}
