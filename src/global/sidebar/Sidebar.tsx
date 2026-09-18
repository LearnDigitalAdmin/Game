import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Trophy, Shield, DollarSign, Save, LogOut } from "lucide-react";
import type { Mode, NavItem } from "../types/GameTypes";

export function Sidebar({
  mode,
  header,
  items,
  palette,
  collapsed,
  onToggle,
  activeKey,
  onSelect,
  onSave,
  onExit,
}: {
  mode: Mode;
  header: { title: string; subtitle: string };
  items: NavItem[];
  palette: any;
  collapsed: boolean;
  onToggle: () => void;
  activeKey: string;
  onSelect: (k: string) => void;
  onSave: () => void;
  onExit: () => void;
}) {
  const widthExpanded = 240;
  const widthCollapsed = 80;

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? widthCollapsed : widthExpanded }}
      className={`h-full bg-gradient-to-b ${palette.sidebar.from} ${palette.sidebar.to} text-white border-r border-white/10 shadow-xl flex flex-col`}
      style={{ minWidth: collapsed ? widthCollapsed : widthExpanded }}
    >
      <div className="px-4 pt-5 pb-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${palette.badge}`}>
            {mode === "player" && <Trophy className="w-5 h-5" />}
            {mode === "manager" && <Shield className="w-5 h-5" />}
            {mode === "owner" && <DollarSign className="w-5 h-5" />}
          </div>
          {!collapsed && (
            <div>
              <div className="font-extrabold tracking-tight">{header.title}</div>
              <div className="text-xs text-white/80">{header.subtitle}</div>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto px-2 py-3 space-y-1">
        {items.map((it) => (
          <button
            key={it.key}
            onClick={() => onSelect(it.key)}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-colors ${
              activeKey === it.key ? palette.itemActive : palette.item
            }`}
            title={collapsed ? it.label : undefined}
          >
            <span className="shrink-0">{it.icon}</span>
            {!collapsed && <span className="text-sm font-medium">{it.label}</span>}
          </button>
        ))}
      </div>

      {/* Bottom Action Buttons */}
      <div className="px-2 pb-3 border-t border-white/10 space-y-2">
        {/* Save Button */}
        <button
          onClick={onSave}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl bg-gradient-to-r from-emerald-600/20 to-teal-600/20 hover:from-emerald-500/30 hover:to-teal-500/30 border border-emerald-400/20 transition-all duration-200`}
          title={collapsed ? "Save Game" : undefined}
        >
          <Save className="w-4 h-4 shrink-0 text-emerald-300" />
          {!collapsed && <span className="text-sm font-medium text-emerald-200">Save Game</span>}
        </button>

        {/* Exit Button */}
        <button
          onClick={onExit}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl bg-gradient-to-r from-red-600/20 to-red-700/20 hover:from-red-500/30 hover:to-red-600/30 border border-red-400/20 transition-all duration-200`}
          title={collapsed ? "Exit Game" : undefined}
        >
          <LogOut className="w-4 h-4 shrink-0 text-red-300" />
          {!collapsed && <span className="text-sm font-medium text-red-200">Exit Game</span>}
        </button>

        {/* Collapse/Expand Toggle */}
        <button
          onClick={onToggle}
          className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl ${palette.collapse}`}
          title={collapsed ? "Expand" : "Collapse"}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          {!collapsed && <span className="text-sm">Collapse</span>}
        </button>
      </div>
    </motion.aside>
  );
}