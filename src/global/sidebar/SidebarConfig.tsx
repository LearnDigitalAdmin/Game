//module - global/sidebar/SidebarConfig.tsx
import { Home, Users, Trophy, Briefcase, CalendarDays, User, Target, Mail, Shield, DollarSign, LineChart, Building2, Flag, Star } from "lucide-react";
import type { Mode, NavItem } from "../types/GameTypes";

const palettes = () => ({
  player: {
    dot: "bg-emerald-500",
    badge: "bg-emerald-600/90",
    sidebar: { from: "from-emerald-900", to: "to-teal-900" },
    item: "hover:bg-white/10 text-white/90",
    itemActive: "bg-white/15 text-white",
    collapse: "bg-white/10 hover:bg-white/20",
    cardHead: "text-emerald-900 bg-emerald-200",
  },
  manager: {
    dot: "bg-sky-500",
    badge: "bg-sky-600/90",
    sidebar: { from: "from-slate-900", to: "to-indigo-900" },
    item: "hover:bg-white/10 text-white/90",
    itemActive: "bg-white/15 text-white",
    collapse: "bg-white/10 hover:bg-white/20",
    cardHead: "text-indigo-900 bg-indigo-200",
  },
  owner: {
    dot: "bg-amber-500",
    badge: "bg-amber-600/90",
    sidebar: { from: "from-zinc-900", to: "to-amber-900" },
    item: "hover:bg-white/10 text-white/90",
    itemActive: "bg-white/15 text-white",
    collapse: "bg-white/10 hover:bg-white/20",
    cardHead: "text-amber-900 bg-amber-200",
  },
});

export function getSidebarConfig(mode: Mode) {
  const p = palettes();
  if (mode === "player")
    return {
      palette: p.player,
      header: { title: "Player Menu", subtitle: "Profile • Training • Matches" },
      items: [
        { key: "home", label: "Dashboard", icon: <Home className="w-4 h-4" /> },
        { key: "profile", label: "Profile", icon: <User className="w-4 h-4" /> },
        { key: "training", label: "Training", icon: <Target className="w-4 h-4" /> },
        { key: "matches", label: "Matches", icon: <Flag className="w-4 h-4" /> },
        { key: "career", label: "Career", icon: <Briefcase className="w-4 h-4" /> },
        { key: "agent", label: "Agent", icon: <Mail className="w-4 h-4" /> },
        { key: "calendar", label: "Calendar", icon: <CalendarDays className="w-4 h-4" /> },
      ] as NavItem[],
    };
  if (mode === "manager")
    return {
      palette: p.manager,
      header: { title: "Manager Menu", subtitle: "Squad • Tactics • Transfers" },
      items: [
        { key: "home", label: "Dashboard", icon: <Home className="w-4 h-4" /> },
        { key: "squad", label: "Squad", icon: <Users className="w-4 h-4" /> },
        { key: "tactics", label: "Tactics", icon: <Target className="w-4 h-4" /> },
        { key: "transfers", label: "Transfers", icon: <DollarSign className="w-4 h-4" /> },
        { key: "matches", label: "Matches", icon: <Trophy className="w-4 h-4" /> },
        { key: "club", label: "Club", icon: <Shield className="w-4 h-4" /> },
        { key: "calendar", label: "Calendar", icon: <CalendarDays className="w-4 h-4" /> },
      ] as NavItem[],
    };
  if (mode === "owner")
    return {
      palette: p.owner,
      header: { title: "Owner Menu", subtitle: "Finances • Stadium • Staff" },
      items: [
        { key: "home", label: "Dashboard", icon: <Home className="w-4 h-4" /> },
        { key: "finances", label: "Finances", icon: <LineChart className="w-4 h-4" /> },
        { key: "stadium", label: "Stadium", icon: <Building2 className="w-4 h-4" /> },
        { key: "staff", label: "Staff", icon: <Users className="w-4 h-4" /> },
        { key: "transfers", label: "Transfers", icon: <DollarSign className="w-4 h-4" /> },
        { key: "media", label: "Media", icon: <Star className="w-4 h-4" /> },
        { key: "calendar", label: "Calendar", icon: <CalendarDays className="w-4 h-4" /> },
      ] as NavItem[],
    };
}


export function labelFromKey(key: string) {
  const labels = {
    home: "Dashboard",
    profile: "Profile",
    training: "Training",
    matches: "Matches",
    career: "Career",
    agent: "Agent",
    squad: "Squad",
    tactics: "Tactics",
    transfers: "Transfers",
    club: "Club",
    finances: "Finances",
    stadium: "Stadium",
    staff: "Staff",
    media: "Media",
    calendar: "Calendar",
  };
  return (labels as any)[key] || key;
}