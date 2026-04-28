import React, { useState, useEffect } from 'react';
import { useLeadStore } from '@/stores/useLeadStore';
import { X, AlertTriangle, CheckCircle2, Trash2 } from 'lucide-react';
import styles from './DuplicateResolver.module.css';

export default function DuplicateResolver({ onClose }) {
  const findDuplicates = useLeadStore(state => state.findDuplicates);
  const resolveDuplicates = useLeadStore(state => state.resolveDuplicates);
  const [duplicates, setDuplicates] = useState([]);
  const [currentGroupIndex, setCurrentGroupIndex] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const dups = findDuplicates();
    setDuplicates(dups);
  }, [findDuplicates]);

  if (duplicates.length === 0) {
    return (
      <div className={styles.overlay}>
        <div className={styles.modal}>
          <div className={styles.header}>
            <h2>Check Duplicates</h2>
            <button onClick={onClose} className={styles.closeBtn}><X size={20}/></button>
          </div>
          <div className={styles.emptyState}>
            <CheckCircle2 size={48} color="var(--status-meeting)" />
            <h3>All Clean!</h3>
            <p>No duplicates found in your CRM.</p>
            <button onClick={onClose} className={styles.primaryBtn}>Done</button>
          </div>
        </div>
      </div>
    );
  }

  const currentGroup = duplicates[currentGroupIndex];
  
  const handleKeep = async (keepId) => {
    setLoading(true);
    const deleteIds = currentGroup.leads.filter(l => l.id !== keepId).map(l => l.id);
    await resolveDuplicates(keepId, deleteIds);
    setLoading(false);
    
    if (currentGroupIndex < duplicates.length - 1) {
      setCurrentGroupIndex(prev => prev + 1);
    } else {
      // Re-check just in case
      const remaining = findDuplicates();
      if (remaining.length === 0) {
        onClose();
      } else {
        setDuplicates(remaining);
        setCurrentGroupIndex(0);
      }
    }
  };

  const handleAutoClearAll = async () => {
    if (!window.confirm("This will automatically keep the newest lead in each duplicate group and delete the rest. Proceed?")) return;
    
    setLoading(true);
    // Collect all IDs to delete (everything except the first item in each group)
    const allDeleteIds = duplicates.flatMap(group => 
      group.leads.slice(1).map(l => l.id)
    );
    
    if (allDeleteIds.length > 0) {
      await resolveDuplicates(null, allDeleteIds);
    }
    setLoading(false);
    onClose();
  };

  const handleSkip = () => {
    if (currentGroupIndex < duplicates.length - 1) {
      setCurrentGroupIndex(prev => prev + 1);
    } else {
      onClose();
    }
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2><AlertTriangle size={20} color="var(--status-callback)" /> Resolve Duplicates</h2>
          <button onClick={onClose} className={styles.closeBtn}><X size={20}/></button>
        </div>
        
        <div className={styles.progress}>
          Group {currentGroupIndex + 1} of {duplicates.length} ({currentGroup.type} match)
        </div>

        <div className={styles.cardList}>
          {currentGroup.leads.map(lead => (
            <div key={lead.id} className={styles.leadCard}>
              <div className={styles.leadInfo}>
                <h4>{lead.name}</h4>
                <p><strong>Company:</strong> {lead.company || 'N/A'}</p>
                <p><strong>Phone:</strong> {lead.phone || 'N/A'}</p>
                <p><strong>Added:</strong> {new Date(lead.created_at).toLocaleDateString()}</p>
              </div>
              <button 
                className={styles.keepBtn} 
                onClick={() => handleKeep(lead.id)}
                disabled={loading}
              >
                Keep This & Delete Others
              </button>
            </div>
          ))}
        </div>

        <div className={styles.footer}>
          <button 
            onClick={handleAutoClearAll} 
            className={styles.primaryBtn} 
            style={{ marginRight: 'auto', background: 'var(--status-not-interested)' }}
            disabled={loading}
          >
            Auto-Clear All Duplicates
          </button>
          <button onClick={handleSkip} className={styles.skipBtn} disabled={loading}>Skip for now</button>
        </div>
      </div>
    </div>
  );
}
