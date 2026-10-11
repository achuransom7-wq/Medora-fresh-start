import { useState, useEffect, useCallback } from 'react';
import { Plus, LogOut, User, X, Stethoscope, UserCircle, FolderPlus, Folder, ChevronDown, ChevronRight, Pencil, Trash2, Check, MoreVertical, PanelLeftClose, PanelLeftOpen, FileDown } from 'lucide-react';
import { Link, useNavigate, useParams, useLocation } from 'react-router-dom';
import { severityStyle } from './SeverityBadge';
import { useAuth } from '../context/AuthContext';
import client from '../api/client';

export default function Sidebar({ conversations, onNewChat, onConversationUpdated, onConversationDeleted, onDownloadThreadSummary, isOpen, onClose, collapsed, onToggleCollapsed }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { id: activeId } = useParams();
  const location = useLocation();

  const [projects, setProjects] = useState([]);
  const [expanded, setExpanded] = useState({});
  const [creatingProject, setCreatingProject] = useState(false);
  const [newProjectTitle, setNewProjectTitle] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [openMenuId, setOpenMenuId] = useState(null);
  const [downloadingProjectId, setDownloadingProjectId] = useState(null);

  const loadProjects = useCallback(() => {
    client
      .get('/projects')
      .then(({ data }) => setProjects(data.projects))
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    const title = newProjectTitle.trim();
    if (!title) return;
    try {
      await client.post('/projects', { title });
      setNewProjectTitle('');
      setCreatingProject(false);
      loadProjects();
    } catch {
      // non-fatal
    }
  };

  const toggleExpand = (projectId) => setExpanded((prev) => ({ ...prev, [projectId]: !prev[projectId] }));

  const unassigned = conversations.filter((c) => !c.project_id);
  const byProject = (projectId) => conversations.filter((c) => c.project_id === projectId);

  const handleRename = async (conversationId) => {
    const title = editingTitle.trim();
    if (!title) return;
    try {
      const { data } = await client.patch(`/conversations/${conversationId}`, { title });
      onConversationUpdated?.(data.conversation);
      setEditingId(null);
    } catch {
      // Keep the editor open so the user can try again.
    }
  };

  const handleAssign = async (conversationId, projectId) => {
    try {
      const { data } = await client.patch(`/conversations/${conversationId}`, { projectId: projectId || null });
      onConversationUpdated?.(data.conversation);
      setOpenMenuId(null);
      loadProjects();
    } catch {
      // Keep the selector open so the user can try again.
    }
  };

  const handleDelete = async (conversation) => {
    try {
      await client.delete(`/conversations/${conversation.id}`);
      onConversationDeleted?.(conversation.id);
      if (conversation.id === activeId) navigate('/');
    } catch {
      // Keep the conversation visible when deletion fails.
    }
  };

  const handleRenameProject = async (project) => {
    const title = window.prompt('Rename case thread', project.title)?.trim();
    if (!title || title === project.title) return;
    try {
      await client.patch(`/projects/${project.id}`, { title });
      loadProjects();
    } catch {
      // Keep the existing title when the update fails.
    }
  };

  const handleDeleteProject = async (project) => {
    try {
      await client.delete(`/projects/${project.id}`);
      const deletedIds = new Set(byProject(project.id).map((conversation) => conversation.id));
      deletedIds.forEach((conversationId) => onConversationDeleted?.(conversationId));
      if (deletedIds.has(activeId)) navigate('/');
      setOpenMenuId(null);
      loadProjects();
    } catch {
      // Keep the thread visible when deletion fails.
    }
  };

  const handleDownloadThreadSummary = async (project) => {
    if (!onDownloadThreadSummary) return;
    setDownloadingProjectId(project.id);
    try {
      await onDownloadThreadSummary(project);
      setOpenMenuId(null);
    } finally {
      setDownloadingProjectId(null);
    }
  };

  const renderConversation = (c) => {
    const s = c.latest_severity ? severityStyle(c.latest_severity) : null;
    const active = c.id === activeId;
    return (
      <div key={c.id} className={`relative group flex items-center gap-1 rounded-xl text-sm transition-colors ${
        active ? 'bg-mint-soft text-teal-deep font-medium' : 'text-ink hover:bg-cloud'
      }`}>
        {editingId === c.id ? (
          <form onSubmit={(e) => { e.preventDefault(); handleRename(c.id); }} className="flex items-center gap-1 flex-1 min-w-0 px-2 py-1">
            <input
              autoFocus
              value={editingTitle}
              onChange={(e) => setEditingTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Escape' && setEditingId(null)}
              maxLength={120}
              className="min-w-0 flex-1 bg-white border border-line rounded-md px-1.5 py-1 text-sm outline-none focus:border-teal-mid"
              aria-label="Conversation name"
            />
            <button type="submit" aria-label="Save conversation name" className="p-1 text-teal-deep hover:bg-white rounded-md"><Check size={14} /></button>
          </form>
        ) : (
          <>
            <Link to={`/chat/${c.id}`} onClick={onClose} className="flex items-center gap-2 min-w-0 flex-1 px-3 py-2">
              {s && <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${s.dot}`} />}
              <span className="truncate">{c.title}</span>
            </Link>
            <div className="relative pr-1">
              <button
                onClick={() => setOpenMenuId((current) => current === c.id ? null : c.id)}
                aria-label={`More options for ${c.title}`}
                title="Conversation options"
                className="p-1.5 text-ink-soft hover:text-teal-deep rounded-md"
              >
                <MoreVertical size={16} />
              </button>
              {openMenuId === c.id && (
                <div className="absolute right-0 top-full z-20 mt-1 w-48 rounded-xl border border-line bg-white p-1.5 shadow-lg">
                  <label className="block px-2 py-1 text-xs text-ink-soft">Case thread</label>
                  <select
                    value={c.project_id || ''}
                    onChange={(e) => handleAssign(c.id, e.target.value)}
                    aria-label={`Assign ${c.title} to a case thread`}
                    className="mb-1 w-full rounded-lg border border-line bg-cloud px-2 py-1.5 text-xs text-ink outline-none"
                  >
                    <option value="">No thread</option>
                    {projects.map((project) => <option key={project.id} value={project.id}>{project.title}</option>)}
                  </select>
                  <button onClick={() => { setEditingId(c.id); setEditingTitle(c.title); setOpenMenuId(null); }} className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-ink hover:bg-cloud">
                    <Pencil size={14} /> Rename
                  </button>
                  <button onClick={() => handleDelete(c)} className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-coral hover:bg-coral-soft">
                    <Trash2 size={14} /> Delete chat
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-ink/30 z-30 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-40 ${collapsed ? 'md:w-16' : 'w-72'} bg-white border-r border-line flex flex-col transition-[width,transform] duration-200 ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className={`p-4 flex items-center border-b border-line ${collapsed ? 'md:justify-center' : 'justify-between'}`}>
          <Link to="/" className={`flex items-center gap-2 ${collapsed ? 'md:hidden' : ''}`}>
            <div className="w-8 h-8 rounded-lg bg-teal-deep flex items-center justify-center">
              <span className="text-white font-display font-semibold text-sm">M</span>
            </div>
            <span className={`font-display font-semibold text-lg text-teal-deep ${collapsed ? 'md:hidden' : ''}`}>Medora</span>
          </Link>
          <button
            onClick={onToggleCollapsed}
            className="hidden md:block p-1 text-ink-soft hover:text-teal-deep"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
          <button onClick={onClose} className="md:hidden p-1 text-ink-soft" aria-label="Close menu">
            <X size={20} />
          </button>
        </div>

        <div className={`p-3 flex gap-2 ${collapsed ? 'md:hidden' : ''}`}>
          <button
            onClick={onNewChat}
            className="flex-1 flex items-center justify-center gap-2 bg-mint text-teal-deep font-medium text-sm py-2.5 rounded-xl hover:bg-mint-soft transition-colors border border-teal-deep/10"
          >
            <Plus size={16} /> New consultation
          </button>
          <button
            onClick={() => setCreatingProject((v) => !v)}
            aria-label="New case thread"
            title="Group consultations into a case thread (e.g. 'Managing my asthma')"
            className="flex-shrink-0 w-10 h-10 rounded-xl border border-line text-ink-soft hover:bg-cloud hover:text-teal-deep transition-colors flex items-center justify-center"
          >
            <FolderPlus size={16} />
          </button>
        </div>

        {creatingProject && !collapsed && (
          <form onSubmit={handleCreateProject} className="px-3 pb-2 flex gap-1.5">
            <input
              autoFocus
              value={newProjectTitle}
              onChange={(e) => setNewProjectTitle(e.target.value)}
              placeholder="e.g. Managing my asthma"
              className="flex-1 text-sm border border-line rounded-lg px-2.5 py-1.5 outline-none focus:border-teal-mid"
            />
            <button type="submit" className="text-sm text-teal-deep font-medium px-2">
              Add
            </button>
          </form>
        )}

        <div className={`flex-1 overflow-y-auto px-2 pb-2 ${collapsed ? 'md:hidden' : ''}`}>
          {projects.length > 0 && (
            <>
              <p className="px-2 py-2 text-xs font-medium text-ink-soft/70 uppercase tracking-wide">Case threads</p>
              <div className="space-y-1 mb-3">
                {projects.map((p) => {
                  const items = byProject(p.id);
                  const isOpen2 = expanded[p.id] ?? true;
                  return (
                    <div key={p.id}>
                      <div className="relative flex items-center gap-1">
                        <button
                          onClick={() => toggleExpand(p.id)}
                          className="w-full flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm text-ink hover:bg-cloud transition-colors"
                        >
                        {isOpen2 ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                        <Folder size={14} className="text-teal-mid flex-shrink-0" />
                        <span className="truncate font-medium flex-1 text-left">{p.title}</span>
                        <span className="text-xs text-ink-soft/60">{items.length}</span>
                        </button>
                        <button
                          onClick={() => setOpenMenuId((current) => current === p.id ? null : p.id)}
                          aria-label={`More options for ${p.title}`}
                          title="Case thread options"
                          className="absolute right-1 p-1.5 text-ink-soft hover:text-teal-deep rounded-md"
                        >
                          <MoreVertical size={16} />
                        </button>
                        {openMenuId === p.id && (
                          <div className="absolute right-0 top-full z-20 mt-1 w-44 rounded-xl border border-line bg-white p-1.5 shadow-lg">
                            {onDownloadThreadSummary && (
                              <button
                                onClick={() => handleDownloadThreadSummary(p)}
                                disabled={downloadingProjectId === p.id}
                                className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-ink hover:bg-cloud disabled:opacity-50"
                              >
                                <FileDown size={14} /> {downloadingProjectId === p.id ? 'Preparing...' : 'Download summary'}
                              </button>
                            )}
                            <button onClick={() => { handleRenameProject(p); setOpenMenuId(null); }} className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-ink hover:bg-cloud">
                              <Pencil size={14} /> Rename thread
                            </button>
                            <button onClick={() => handleDeleteProject(p)} className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-coral hover:bg-coral-soft">
                              <Trash2 size={14} /> Delete thread
                            </button>
                          </div>
                        )}
                      </div>
                      {isOpen2 && (
                        <div className="ml-5 space-y-0.5">
                          {items.length === 0 ? (
                            <p className="px-3 py-1 text-xs text-ink-soft/60">No consultations yet</p>
                          ) : (
                            items.map(renderConversation)
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          <p className="px-2 py-2 text-xs font-medium text-ink-soft/70 uppercase tracking-wide">
            {projects.length > 0 ? 'Other consultations' : 'Consultations'}
          </p>
          {unassigned.length === 0 && (
            <p className="px-3 py-4 text-sm text-ink-soft">No consultations yet. Start one above.</p>
          )}
          <div className="space-y-1">{unassigned.map(renderConversation)}</div>
        </div>

        <div className={`p-2 border-t border-line space-y-1 ${collapsed ? 'md:hidden' : ''}`}>
          <Link
            to="/referrals"
            onClick={onClose}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-colors ${
              location.pathname === '/referrals' ? 'bg-mint-soft text-teal-deep font-medium' : 'text-ink hover:bg-cloud'
            }`}
          >
            <Stethoscope size={16} /> Referrals
          </Link>
          <Link
            to="/profile"
            onClick={onClose}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-colors ${
              location.pathname === '/profile' ? 'bg-mint-soft text-teal-deep font-medium' : 'text-ink hover:bg-cloud'
            }`}
          >
            <UserCircle size={16} /> Profile
          </Link>
          <div className="flex items-center gap-2 px-2 py-2 mt-1">
            <div className="w-8 h-8 rounded-full bg-mint flex items-center justify-center flex-shrink-0">
              <User size={16} className="text-teal-deep" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-ink truncate">{user?.fullName}</p>
              <p className="text-xs text-ink-soft truncate">{user?.email}</p>
            </div>
            <button
              onClick={handleLogout}
              aria-label="Log out"
              className="p-1.5 text-ink-soft hover:text-coral transition-colors"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
