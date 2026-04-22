"use client";

import { useState, useRef } from "react";
import { useLeadStore } from "@/stores/useLeadStore";
import { ArrowLeft, Search, MapPin, Briefcase, Star, Globe, Phone, ExternalLink, Download, CheckSquare, Square, X, Loader2 } from "lucide-react";
import Link from "next/link";
import Papa from "papaparse";
import styles from "./page.module.css";
import { useRouter } from "next/navigation";

export default function ExtractorPage() {
  const router = useRouter();
  const { addLeads } = useLeadStore();

  const [keywords, setKeywords] = useState(["restaurant", "gym"]);
  const [keywordInput, setKeywordInput] = useState("");
  
  const [locations, setLocations] = useState(["Austin, TX"]);
  const [locationInput, setLocationInput] = useState("");

  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);

  // Filters
  const [filterWebsite, setFilterWebsite] = useState("any"); // "any", "yes", "no"
  const [minReviews, setMinReviews] = useState("");
  const [minRating, setMinRating] = useState("");

  const handleAddTag = (e, type) => {
    if (e.key === "Enter" && e.target.value.trim() !== "") {
      e.preventDefault();
      if (type === "keyword") {
        if (!keywords.includes(e.target.value.trim())) {
          setKeywords([...keywords, e.target.value.trim()]);
        }
        setKeywordInput("");
      } else {
        if (!locations.includes(e.target.value.trim())) {
          setLocations([...locations, e.target.value.trim()]);
        }
        setLocationInput("");
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
        body: JSON.stringify({ keywords, locations }),
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch leads from Google Maps");
      }

      if (data.demoMode) {
        alert(data.demoMessage || "Running in Demo Mode");
      }

      setResults(data.leads || []);
    } catch (err) {
      console.error(err);
      alert(err.message || "Search failed. Ensure your Google Maps API Key is set and billing is enabled.");
    } finally {
      setIsSearching(false);
    }
  };

  const filteredResults = results.filter(lead => {
    if (filterWebsite === "yes" && !lead.website) return false;
    if (filterWebsite === "no" && lead.website) return false;
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

  const handleImport = async () => {
    if (selectedIds.length === 0) return;
    
    const leadsToImport = filteredResults
      .filter(r => selectedIds.includes(r.id))
      .map(r => ({
        name: r.name,
        company: r.name,
        industry: r.industry,
        phone: r.phone || "No Phone",
        email: "", // Maps API doesn't provide email easily
        website: r.website,
        socialLink: r.googleMapsLink, // Use GMaps as social link
        tags: ["Extracted", r.searchKeyword, r.searchLocation],
      }));

    await addLeads(leadsToImport);
    alert(`Successfully imported ${leadsToImport.length} leads into Outreach OS!`);
    router.push("/");
  };

  const handleExportCSV = () => {
    let dataToExport = [];
    
    if (selectedIds.length > 0) {
      dataToExport = filteredResults.filter(r => selectedIds.includes(r.id));
    } else {
      const limitStr = window.prompt(`How many leads do you want to export? (Max: ${filteredResults.length})`, filteredResults.length);
      if (!limitStr) return; // User cancelled
      const limit = parseInt(limitStr);
      if (isNaN(limit) || limit <= 0) return alert("Please enter a valid number.");
      dataToExport = filteredResults.slice(0, limit);
    }

    if (dataToExport.length === 0) return alert("No leads to export.");
    
    const formattedExport = dataToExport.map(r => ({
        "Business Name": r.name,
        "Industry": r.industry,
        "Phone": r.phone,
        "Rating": r.rating,
        "Reviews": r.reviewsCount,
        "Website": r.website,
        "Address": r.address,
        "Google Maps Link": r.googleMapsLink,
        "Search Keyword": r.searchKeyword,
        "Search Location": r.searchLocation
      }));

    const csv = Papa.unparse(formattedExport);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Maps_Leads_Export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.title}>
          <MapPin size={24} color="var(--accent-primary)" />
          Google Maps Lead Extractor
        </div>
        <Link href="/" className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ArrowLeft size={16} /> Back to Dashboard
        </Link>
      </header>

      <section className={styles.panel}>
        <div className={styles.searchGrid}>
          {/* Keywords Input */}
          <div className={styles.inputGroup}>
            <label className={styles.label}><Briefcase size={14} style={{display:'inline', marginRight: 4}}/> Keywords / Industries</label>
            <div className={styles.tagInputWrapper}>
              {keywords.map((tag, i) => (
                <div key={i} className={styles.tag}>
                  {tag} <button onClick={() => removeTag("keyword", i)}><X size={12} /></button>
                </div>
              ))}
              <input
                className={styles.tagInput}
                placeholder="Type and press enter..."
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                onKeyDown={(e) => handleAddTag(e, "keyword")}
                autoComplete="on"
                autoCorrect="on"
              />
            </div>
          </div>

          {/* Locations Input */}
          <div className={styles.inputGroup}>
            <label className={styles.label}><MapPin size={14} style={{display:'inline', marginRight: 4}}/> Locations</label>
            <div className={styles.tagInputWrapper}>
              {locations.map((tag, i) => (
                <div key={i} className={styles.tag}>
                  {tag} <button onClick={() => removeTag("location", i)}><X size={12} /></button>
                </div>
              ))}
              <input
                className={styles.tagInput}
                placeholder="Type and press enter..."
                value={locationInput}
                onChange={(e) => setLocationInput(e.target.value)}
                onKeyDown={(e) => handleAddTag(e, "location")}
                autoComplete="on"
                autoCorrect="on"
              />
            </div>
          </div>
        </div>

        <div className={styles.actionRow}>
          <div className={styles.filters}>
            <div className={styles.filterGroup}>
              <label className={styles.label}>Website:</label>
              <select className={styles.select} value={filterWebsite} onChange={(e) => setFilterWebsite(e.target.value)}>
                <option value="any">Any</option>
                <option value="yes">Has Website</option>
                <option value="no">No Website</option>
              </select>
            </div>
            <div className={styles.filterGroup}>
              <label className={styles.label}>Min Reviews:</label>
              <input type="number" className={styles.numberInput} placeholder="0" value={minReviews} onChange={(e) => setMinReviews(e.target.value)} />
            </div>
            <div className={styles.filterGroup}>
              <label className={styles.label}>Min Rating:</label>
              <input type="number" className={styles.numberInput} placeholder="0.0" step="0.1" value={minRating} onChange={(e) => setMinRating(e.target.value)} />
            </div>
          </div>

          <button className={styles.searchBtn} onClick={handleSearch} disabled={isSearching}>
            {isSearching ? <Loader2 size={18} className={styles.spinning} /> : <Search size={18} />}
            {isSearching ? "Extracting..." : "Start Extraction"}
          </button>
        </div>
      </section>

      <section className={styles.panel} style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div className={styles.resultsHeader}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 600 }}>
            Results ({filteredResults.length})
          </h2>
          {filteredResults.length > 0 && (
            <div className={styles.bulkActions}>
              <button className="btn btn-outline" onClick={handleExportCSV}>
                <Download size={16} /> {selectedIds.length > 0 ? `Export Selected (${selectedIds.length})` : 'Export Specific Number'}
              </button>
              <button className="btn btn-primary" onClick={handleImport} disabled={selectedIds.length === 0}>
                Import to Call Tool ({selectedIds.length})
              </button>
            </div>
          )}
        </div>

        {results.length === 0 && !isSearching && (
          <div className={styles.emptyState}>
            <Search size={48} color="var(--border-color)" />
            <p>Enter keywords and locations above to start finding leads.</p>
          </div>
        )}

        {filteredResults.length > 0 && (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th style={{ width: '40px', cursor: 'pointer' }} onClick={selectAll}>
                    {selectedIds.length === filteredResults.length && filteredResults.length > 0 ? (
                      <CheckSquare size={18} color="var(--accent-primary)" />
                    ) : (
                      <Square size={18} color="var(--text-muted)" />
                    )}
                  </th>
                  <th>Business Name</th>
                  <th>Industry</th>
                  <th>Contact</th>
                  <th>Rating</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredResults.map(lead => (
                  <tr key={lead.id}>
                    <td onClick={() => toggleSelection(lead.id)} style={{ cursor: 'pointer' }}>
                      {selectedIds.includes(lead.id) ? (
                        <CheckSquare size={18} color="var(--accent-primary)" />
                      ) : (
                        <Square size={18} color="var(--text-muted)" />
                      )}
                    </td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{lead.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{lead.address}</div>
                    </td>
                    <td>
                      <span className={styles.tag} style={{ display: 'inline-block' }}>{lead.industry}</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        {lead.phone ? (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Phone size={12} /> {lead.phone}</span>
                        ) : <span style={{ color: 'var(--text-muted)' }}>No Phone</span>}
                        
                        {lead.website ? (
                          <a href={lead.website} target="_blank" rel="noreferrer" className={styles.link} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <Globe size={12} /> Website
                          </a>
                        ) : <span style={{ color: 'var(--text-muted)' }}>No Website</span>}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--status-meeting)' }}>
                        <Star size={14} fill="currentColor" /> {lead.rating}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{lead.reviewsCount} reviews</div>
                    </td>
                    <td>
                      <a href={lead.googleMapsLink} target="_blank" rel="noreferrer" className="btn btn-outline" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}>
                        <ExternalLink size={14} /> Maps
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
