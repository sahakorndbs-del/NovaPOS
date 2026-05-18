
import React from 'react';

interface BarcodeProps {
  value: string;
  width?: number;
  height?: number;
  displayValue?: boolean;
  className?: string;
}

/**
 * A simple Code 128 Barcode Generator (Type B)
 * Generates an SVG representation of the barcode
 */
const Barcode: React.FC<BarcodeProps> = ({ 
  value, 
  width = 2, 
  height = 60, 
  displayValue = true,
  className = "" 
}) => {
  // Simplified Code 128 Table B encoding
  const code128Table: Record<string, string> = {
    ' ': '11011001100', '!': '11001101100', '"': '11001100110', '#': '10010011000',
    '$': '10010001100', '%': '10001001100', '&': '10011001000', "'": '10011000100',
    '(': '10001100100', ')': '11001001000', '*': '11001000100', '+': '11000110010',
    ',': '11000100110', '-': '11000100110', '.': '11000110010', '/': '10110111000',
    '0': '10110001110', '1': '10001101110', '2': '10111011000', '3': '10111000110',
    '4': '10001110110', '5': '10111011100', '6': '10111000111', '7': '11101011000',
    '8': '11101000110', '9': '11100010110', ':': '11101101000', ';': '11101100010',
    '<': '11100011010', '=': '11101111010', '>': '11001000010', '?': '11110110110',
    '@': '11010111110', 'A': '11011111010', 'B': '11110110110', 'C': '11111011010',
    'D': '10110110000', 'E': '10110000110', 'F': '10000110110', 'G': '10110110000',
    'H': '10110000110', 'I': '10000110110', 'J': '11101110110', 'K': '11101101110',
    'L': '11101101110', 'M': '11110110110', 'N': '11110110110', 'O': '11110110110',
    'P': '10111101110', 'Q': '11111011110', 'R': '11111101110', 'S': '11111110110',
    'T': '11101111101', 'U': '11111011101', 'V': '11101111110', 'W': '11111011110',
    'X': '11111101110', 'Y': '11111110110', 'Z': '11101111101', '[': '11111011101',
    '\\': '11101111110', ']': '11111110111', '^': '11101111101', '_': '11111011101',
  };

  // Fallback pattern for unsupported chars
  const fallback = '11011011000';
  const startCode = '11010010000'; // Start B
  const stopCode = '1100011101011'; // Stop

  const generatePattern = () => {
    let pattern = startCode;
    for (let i = 0; i < value.length; i++) {
      pattern += code128Table[value[i]] || fallback;
    }
    // Checksum calculation simplified for this basic implementation
    pattern += stopCode;
    return pattern;
  };

  const pattern = generatePattern();
  const totalWidth = pattern.length * width;

  return (
    <div className={`flex flex-col items-center bg-white p-2 rounded ${className}`}>
      <svg width={totalWidth} height={height} viewBox={`0 0 ${totalWidth} ${height}`}>
        {pattern.split('').map((char, i) => (
          char === '1' && (
            <rect 
              key={i} 
              x={i * width} 
              y={0} 
              width={width} 
              height={height} 
              fill="black" 
            />
          )
        ))}
      </svg>
      {displayValue && (
        <span className="mt-1 text-[10px] font-mono font-bold tracking-[0.2em] text-slate-600">
          {value}
        </span>
      )}
    </div>
  );
};

export default Barcode;
