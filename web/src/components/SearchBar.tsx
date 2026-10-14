import { useState } from 'react';

interface Props {
  pincode: string;
  onPincode: (p: string) => void;
  onSearch: (q: string) => void;
  loading: boolean;
}

export function SearchBar({ pincode, onPincode, onSearch, loading }: Props) {
  const [q, setQ] = useState('');
  const valid = q.trim() && /^\d{6}$/.test(pincode);
  return (
    <form
      className="searchbar"
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) onSearch(q.trim());
      }}
    >
      <input
        className="grow"
        placeholder="Search a product, e.g. Amul butter 500 g"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        aria-label="Product name"
      />
      <input
        className="pin"
        placeholder="Pincode"
        inputMode="numeric"
        maxLength={6}
        value={pincode}
        onChange={(e) => onPincode(e.target.value.replace(/\D/g, ''))}
        aria-label="Delivery pincode"
      />
      <button type="submit" disabled={!valid || loading}>
        {loading ? 'Searching…' : 'Search'}
      </button>
    </form>
  );
}
