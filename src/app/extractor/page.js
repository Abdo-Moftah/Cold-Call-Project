"use client";

import { useState, useRef, useEffect } from "react";
import { useLeadStore } from "@/stores/useLeadStore";
import { 
  ArrowLeft, Search, MapPin, Briefcase, Star, Globe, Phone, 
  ExternalLink, Download, CheckSquare, Square, X, Loader2, 
  Filter, LayoutGrid, List, MoreVertical, CheckCircle2, AlertCircle
} from "lucide-react";
import Link from "next/link";
import Papa from "papaparse";
import styles from "./page.module.css";
import { useRouter } from "next/navigation";

export default function ExtractorPage() {
  const router = useRouter();
  const { addLeads, theme, setTheme } = useLeadStore();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Search Inputs
  const [keywords, setKeywords] = useState(["Web Design", "Software"]);
  const [keywordInput, setKeywordInput] = useState("");
  const [locations, setLocations] = useState(["Cairo, Egypt"]);
  const [locationInput, setLocationInput] = useState("");
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [isTypingLocation, setIsTypingLocation] = useState(false);
  
  const suggestionsRef = useRef(null);
  const debounceTimer = useRef(null);

  // Results State
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [viewMode, setViewMode] = useState("table"); // "table" or "grid"

  // UI Filters
  const [filterWebsite, setFilterWebsite] = useState("any");
  const [minReviews, setMinReviews] = useState("");
  const [minRating, setMinRating] = useState("");
  const [maxResultsLimit, setMaxResultsLimit] = useState("50");

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target)) {
        setLocationSuggestions([]);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleAddTag = (e, type) => {
    if (e.key === "Enter" && e.target.value.trim() !== "") {
      e.preventDefault();
      const val = e.target.value.trim();
      if (type === "keyword") {
        if (!keywords.includes(val)) setKeywords([...keywords, val]);
        setKeywordInput("");
      } else {
        if (!locations.includes(val)) setLocations([...locations, val]);
        setLocationInput("");
        setLocationSuggestions([]);
      }
    }
  };

  const removeTag = (type, indexToRemove) => {
    if (type === "keyword") {
      setKeywords(keywords.filter((_, index) => index !== indexToRemove));
    } else {
      setLocations(locations.filter((_, index) => index !== indexToRemove));
    }
  };

  const handleLocationChange = (e) => {
    const val = e.target.value;
    setLocationInput(val);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    if (val.length > 2) {
      setIsTypingLocation(true);
      debounceTimer.current = setTimeout(async () => {
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(val)}&format=json&addressdetails=1&limit=5`);
          const data = await res.json();
          setLocationSuggestions(data.map(d => d.display_name));
        } catch (err) {
          console.error(err);
        } finally {
          setIsTypingLocation(false);
        }
      }, 400);
    } else {
      setLocationSuggestions([]);
    }
  };

  const handleSearch = async () => {
    if (keywords.length === 0 || locations.length === 0) {
      alert("Please add at least one keyword and one location.");
      return;
    }

    setIsSearching(true);
    setResults([]);
    setSelectedIds([]);

    try {
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          keywords, 
          locations, 
          maxResults: parseInt(maxResultsLimit),
          filterWebsite
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Extraction failed");
      setResults(data.leads || []);
    } catch (err) {
      alert(err.message);
    } finally {
      setIsSearching(false);
    }
  };

  const filteredResults = results.filter(lead => {
    if (minReviews && lead.reviewsCount < parseInt(minReviews)) return false;
    if (minRating && lead.rating < parseFloat(minRating)) return false;
    return true;
  });

  const toggleSelection = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const selectAll = () => {
    if (selectedIds.length === filteredResults.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredResults.map(r => r.id));
    }
  };

  const handleExportCSV = () => {
    const dataToExport = selectedIds.length > 0 
      ? filteredResults.filter(r => selectedIds.includes(r.id))
      : filteredResults;

    if (dataToExport.length === 0) return alert("No results to export");

    const formatted = dataToExport.map(r => ({
      "Business Name": r.name,
      "Industry": r.industry,
      "Phone": r.phone,
      "Rating": r.rating,
      "Reviews": r.reviewsCount,
      "Website": r.website,
      "Address": r.address,
      "Google Maps Link": r.googleMapsLink
    }));

    const csv = Papa.unparse(formatted);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `leads_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const handleImportToCRM = async () => {
    const dataToImport = selectedIds.length > 0 
      ? filteredResults.filter(r => selectedIds.includes(r.id))
      : filteredResults;

    if (dataToImport.length === 0) return alert("No leads to import");

    const formattedLeads = dataToImport.map(r => ({
      name: r.name,
      company: r.name, // Usually the business name is both name and company for local businesses
      phone: r.phone || 'No Phone',
      email: '',
      socialLink: r.googleMapsLink,
      website: r.website,
      tags: [r.industry],
      notes: [
        { content: `Address: ${r.address}\nRating: ${r.rating} stars (${r.reviewsCount} reviews)` }
      ]
    }));

    try {
      await addLeads(formattedLeads);
      alert(`Successfully imported ${formattedLeads.length} leads to your Call Tool!`);
      router.push('/');
    } catch (err) {
      alert("Failed to import leads. Check console.");
      console.error(err);
    }
  };

  return (
    <div className={styles.dashboard}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <div className={styles.logo}>
            <div className={styles.logoIcon}><MapPin size={20} /></div>
            <span>LeadExtractor</span>
          </div>
        </div>
        
        <nav className={styles.nav}>
          <div className={styles.navItemActive}>
            <LayoutGrid size={18} />
            <span>Dashboard</span>
          </div>
          <Link href="/" className={styles.navItem}>
            <ArrowLeft size={18} />
            <span>Back Home</span>
          </Link>
        </nav>

        <div className={styles.sidebarFooter}>
           <div className={styles.themeSelector}>
             <label>Theme</label>
             <select value={theme} onChange={(e) => setTheme(e.target.value)}>
               <option value="default">Midnight</option>
               <option value="earth">Earth</option>
               <option value="sky">Sky</option>
               <option value="midnight">Purple</option>
               <option value="white">Parchment</option>
             </select>
           </div>
        </div>
      </aside>

      <main className={styles.main}>
        <header className={styles.topBar}>
          <div className={styles.pageTitle}>
            <h1>Maps Extraction Dashboard</h1>
            <p>Scrape business leads directly from Google Maps</p>
          </div>
          <div className={styles.topActions}>
            <button 
              className={styles.extractBtn} 
              style={{ padding: '0.5rem 1rem', background: 'var(--accent-primary)', display: 'flex', gap: '0.5rem', alignItems: 'center' }}
              onClick={handleImportToCRM}
              disabled={isSearching || filteredResults.length === 0}
            >
              <Phone size={16} />
              Import to Call Tool
            </button>
            <button className={styles.iconBtn} title="Download CSV" onClick={handleExportCSV}>
              <Download size={20} />
            </button>
          </div>
        </header>

        <section className={styles.content}>
          <div className={styles.configCard}>
            <div className={styles.inputGrid}>
              <div className={styles.inputBox}>
                <label><Briefcase size={14} /> Industries</label>
                <div className={styles.tagList}>
                  {keywords.map((k, i) => (
                    <span key={i} className={styles.tag}>{k} <X size={12} onClick={() => removeTag("keyword", i)} /></span>
                  ))}
                  <input 
                    placeholder="e.g. Restaurants" 
                    value={keywordInput}
                    onChange={(e) => setKeywordInput(e.target.value)}
                    onKeyDown={(e) => handleAddTag(e, "keyword")}
                  />
                </div>
              </div>

              <div className={styles.inputBox}>
                <label><MapPin size={14} /> Locations</label>
                <div className={styles.tagList}>
                  {locations.map((l, i) => (
                    <span key={i} className={styles.tag}>{l} <X size={12} onClick={() => removeTag("location", i)} /></span>
                  ))}
                  <div style={{position:'relative', flex:1}}>
                    <input 
                      placeholder="e.g. London" 
                      value={locationInput}
                      onChange={handleLocationChange}
                      onKeyDown={(e) => handleAddTag(e, "location")}
                    />
                    {locationSuggestions.length > 0 && (
                      <div className={styles.suggestions} ref={suggestionsRef}>
                        {locationSuggestions.map((s, i) => (
                          <div key={i} onClick={() => { setLocations([...locations, s]); setLocationInput(""); setLocationSuggestions([]); }}>{s}</div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.configFooter}>
              <div className={styles.filterBar}>
                <div className={styles.filter}>
                  <span>Website Requirement:</span>
                  <select value={filterWebsite} onChange={(e) => setFilterWebsite(e.target.value)}>
                    <option value="any">Any (Fetch All)</option>
                    <option value="yes">Required (Has Website)</option>
                    <option value="no">None (No Website)</option>
                  </select>
                </div>
                <div className={styles.filter}>
                  <span>Min Rating:</span>
                  <input type="number" step="0.1" value={minRating} onChange={(e) => setMinRating(e.target.value)} style={{width: '60px'}} />
                </div>
                <div className={styles.filter}>
                  <span>Max Results/Search:</span>
                  <input type="number" step="10" value={maxResultsLimit} onChange={(e) => setMaxResultsLimit(e.target.value)} style={{width: '70px'}} />
                </div>
              </div>
              <button 
                className={styles.extractBtn} 
                onClick={handleSearch} 
                disabled={isSearching}
              >
                {isSearching ? <Loader2 className={styles.spin} /> : <Search size={18} />}
                {isSearching ? "Extracting..." : "Start Extraction"}
              </button>
            </div>
          </div>

          <div className={styles.resultsPanel}>
            <div className={styles.resultsHeader}>
              <div className={styles.stats}>
                <h2>Found Leads</h2>
                <span>{filteredResults.length} businesses extracted</span>
              </div>
              <div className={styles.viewToggle}>
                <button className={viewMode === 'table' ? styles.activeView : ''} onClick={() => setViewMode('table')}><List size={18}/></button>
                <button className={viewMode === 'grid' ? styles.activeView : ''} onClick={() => setViewMode('grid')}><LayoutGrid size={18}/></button>
              </div>
            </div>

            {isSearching && results.length === 0 && (
              <div className={styles.loadingState}>
                <Loader2 size={48} className={styles.spin} />
                <h3>Initializing Browser...</h3>
                <p>We're opening Google Maps to find the best leads for you.</p>
              </div>
            )}

            {!isSearching && results.length === 0 && (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}><Search size={40} /></div>
                <h3>No Leads Yet</h3>
                <p>Configure your industries and locations to start extracting.</p>
              </div>
            )}

            {filteredResults.length > 0 && (
              <div className={viewMode === 'table' ? styles.tableContainer : styles.gridContainer}>
                {viewMode === 'table' ? (
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th onClick={selectAll} className={styles.checkboxCell}>
                          {selectedIds.length === filteredResults.length ? <CheckSquare size={18} /> : <Square size={18} />}
                        </th>
                        <th>Business Name</th>
                        <th>Category</th>
                        <th>Phone</th>
                        <th>Rating</th>
                        <th>Website</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredResults.map(r => (
                        <tr key={r.id} className={selectedIds.includes(r.id) ? styles.selectedRow : ''}>
                          <td onClick={() => toggleSelection(r.id)} className={styles.checkboxCell}>
                            {selectedIds.includes(r.id) ? <CheckSquare size={18} color="var(--accent-primary)" /> : <Square size={18} />}
                          </td>
                          <td>
                            <div className={styles.nameCell}>
                              <strong>{r.name}</strong>
                              <span className={styles.address}>{r.address}</span>
                            </div>
                          </td>
                          <td><span className={styles.categoryTag}>{r.industry}</span></td>
                          <td>{r.phone || <span className={styles.muted}>N/A</span>}</td>
                          <td>
                            <div className={styles.rating}>
                              <Star size={14} fill="var(--status-meeting)" color="var(--status-meeting)" />
                              {r.rating} <span className={styles.muted}>({r.reviewsCount})</span>
                            </div>
                          </td>
                          <td>
                            {r.website ? (
                              <a href={r.website} target="_blank" className={styles.webLink}><Globe size={14} /> Visit</a>
                            ) : <span className={styles.muted}>None</span>}
                          </td>
                          <td>
                            <a href={r.googleMapsLink} target="_blank" className={styles.mapsBtn}><ExternalLink size={14} /></a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className={styles.grid}>
                    {filteredResults.map(r => (
                      <div key={r.id} className={styles.card}>
                         <div className={styles.cardHeader}>
                           <div className={styles.cardCategory}>{r.industry}</div>
                           <div onClick={() => toggleSelection(r.id)}>
                             {selectedIds.includes(r.id) ? <CheckCircle2 size={20} color="var(--accent-primary)" /> : <Square size={20} />}
                           </div>
                         </div>
                         <h3 className={styles.cardName}>{r.name}</h3>
                         <p className={styles.cardAddress}><MapPin size={12} /> {r.address}</p>
                         <div className={styles.cardStats}>
                            <div className={styles.rating}><Star size={14} fill="var(--status-meeting)" color="var(--status-meeting)" /> {r.rating}</div>
                            <div className={styles.muted}>{r.reviewsCount} reviews</div>
                         </div>
                         <div className={styles.cardFooter}>
                            {r.phone && <span className={styles.cardPhone}><Phone size={12}/> {r.phone}</span>}
                            <div className={styles.cardLinks}>
                               {r.website && <a href={r.website} target="_blank"><Globe size={16}/></a>}
                               <a href={r.googleMapsLink} target="_blank"><ExternalLink size={16}/></a>
                            </div>
                         </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
