import { NativeSelect } from "@/components/admin/native-select";
import { COUNTRIES } from "@/lib/countries";

/**
 * Every ISO 3166-1 country, flag first, in name order.
 *
 * A native <select> rather than a searchable combobox: 249 options is what the
 * platform picker is for — it gets type-ahead, keyboard and touch behaviour for
 * free, posts without JavaScript, and needs no RHF Controller wrapper. A custom
 * listbox would reimplement all of that and lose the last two.
 *
 * The flag is decorative — the name beside it carries the meaning — so a Windows
 * browser rendering the two letters instead of a flag loses nothing.
 */
export function CountrySelect(props: React.ComponentProps<"select">) {
  return (
    <NativeSelect {...props}>
      {COUNTRIES.map((country) => (
        <option key={country.code} value={country.code}>
          {country.flag} {country.name}
        </option>
      ))}
    </NativeSelect>
  );
}
