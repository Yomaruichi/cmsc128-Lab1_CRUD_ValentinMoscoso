export const DEFAULT_FILTERS = { sortBy: 'createdAt', tag: 'All', priority: 'All' };

export default function TaskFilters({ filters, onChange }) {
  const set = (key) => (e) => onChange({ ...filters, [key]: e.target.value });

  return (
    <section className="card controls-bar" aria-label="Sort and filter tasks">
      <div className="control-group">
        <label htmlFor="sort">Sort by</label>
        <select id="sort" value={filters.sortBy} onChange={set('sortBy')}>
          <option value="createdAt">Date added</option><option value="dueDate">Due date</option><option value="priority">Priority</option><option value="tag">Tag</option>
        </select>
      </div>
      <div className="control-group">
        <label htmlFor="filterTag">Tag</label>
        <select id="filterTag" value={filters.tag} onChange={set('tag')}>
          <option value="All">All tags</option><option value="School">School</option><option value="Personal">Personal</option><option value="Others">Others</option>
        </select>
      </div>
      <div className="control-group">
        <label htmlFor="filterPriority">Priority</label>
        <select id="filterPriority" value={filters.priority} onChange={set('priority')}>
          <option value="All">All priorities</option><option value="Low">Low</option><option value="Med">Medium</option><option value="High">High</option>
        </select>
      </div>
    </section>
  );
}
