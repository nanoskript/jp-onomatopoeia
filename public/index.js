import {
  useEffect,
  useState,
} from "https://cdn.skypack.dev/preact@10.11.2/hooks?min";
import { h, render } from "https://cdn.skypack.dev/preact@10.11.2?min";
import {
  toHiragana,
  toKatakana,
} from "https://cdn.skypack.dev/wanakana@5.1.0?min";
import htm from "https://cdn.skypack.dev/htm@3.1.1?min";

// Initialize htm with Preact.
const html = htm.bind(h);

const TermSearchForm = ({ query, updateQuery }) => {
  const termString = () => query.get("term") || "";
  const [string, setString] = useState(termString());
  useEffect(() => setString(termString()), [query]);

  return html`
    <form
      onsubmit=${(e) => {
        e.preventDefault();
        updateQuery("term", string);
      }}
    >
      <div class="term-search-form">
        <input
          type="text"
          value=${string}
          class="term-search-input"
          placeholder="Romaji / Hiragana / Katakana"
          oninput=${(e) => setString(e.target.value)}
          autocomplete="off"
          autocapitalize="none"
          spellcheck="false"
          autofocus
        />
        <input type="submit" value="Search" />
      </div>
    </form>
  `;
};

const Entry = ({ katakana, definitions }) => {
  return html`
    <div>
      <h3>${katakana} · ${toHiragana(katakana)}</h3>
      <ul>
        ${definitions.map(
          ({ english, details }) => html`
            <li>
              ${english}
              ${details &&
              html`<span className="entry-details">${" "} — ${details}</span>`}
            </li>
          `,
        )}
      </ul>
    </div>
  `;
};

const EntryList = ({ data, keys }) => {
  return html`
    <div className="entry-list">
      ${keys.map(
        (katakana) =>
          html`<${Entry} katakana=${katakana} definitions=${data[katakana]} />`,
      )}
    </div>
  `;
};

const SearchResults = ({ query }) => {
  const [data, setData] = useState(null);
  const string = (query.get("term") || "").trim();
  const pattern = toKatakana(string);

  useEffect(async () => {
    const response = await fetch("./onomatopoeia.json");
    setData(await response.json());
  }, []);

  if (!data) {
    return html`
      <h2 style="text-align: center; margin: 8rem 0;">Loading...</h2>
    `;
  }

  if (pattern.length === 0) {
    return html`
      <h2 style="text-align: center; margin: 8rem 0;">
        Search for a sound effect!
      </h2>
    `;
  }

  // Sort keys by length and then lexicographically.
  const keys = Object.keys(data).sort(
    (a, b) => a.length - b.length || a.localeCompare(b),
  );

  // Find exact prefixes.
  const prefixMatches = keys.filter((key) => key.startsWith(pattern));

  // Find matches in the middle of a key.
  const infixMatches = keys.filter(
    (key) => !key.startsWith(pattern) && key.includes(pattern),
  );

  if (prefixMatches.length === 0 && infixMatches.length === 0) {
    return html`
      <div>
        <h2 style="text-align: center; margin: 8rem 0;">No results found</h2>
      </div>
    `;
  }

  return html`
    <div>
      ${prefixMatches.length > 0 &&
      html`
        <div>
          <div>
            <h3 className="entry-list-heading">Exact matches</h3>
            <${EntryList} data=${data} keys=${prefixMatches} />
          </div>
        </div>
      `}
      ${infixMatches.length > 0 &&
      html`
        <div>
          <div>
            <h3 className="entry-list-heading">Similar matches</h3>
            <${EntryList} data=${data} keys=${infixMatches} />
          </div>
        </div>
      `}
    </div>
  `;
};

function usePageQuery() {
  const read = () => new URL(window.location).searchParams;
  const [query, setQuery] = useState(read());
  useEffect(() => {
    const listener = () => setQuery(read());
    window.addEventListener("popstate", listener);
    return () => window.removeEventListener("popstate", listener);
  }, []);
  return [query, setQuery];
}

const Page = () => {
  const [query, setQuery] = usePageQuery();
  const updateQuery = (key, value) => {
    const url = new URL(window.location);
    url.searchParams.set(key, value);
    window.history.pushState(null, "", url.toString());
    setQuery(url.searchParams);
  };

  return html`
    <div>
      <${TermSearchForm} query=${query} updateQuery=${updateQuery} />
      <${SearchResults} query=${query} />
    </div>
  `;
};

render(html`<${Page} />`, document.querySelector("main"));
