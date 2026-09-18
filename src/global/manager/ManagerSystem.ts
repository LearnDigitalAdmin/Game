// src/global/manager/ManagerSystem.ts
// Complete manager employment, hiring, sacking, and career management
// Handles manager lifecycle, employment states, and job offers

import { SQLiteDBConnection } from '@capacitor-community/sqlite';
import { v4 as uuidv4 } from 'uuid';

/**
 * Manager status and employment state
 */
export type ManagerStatus = 'employed' | 'unemployed' | 'retired' | 'deleted';

/**
 * Manager contract details
 */
export interface ManagerContract {
  id: string;
  managerId: string;
  clubId: string;
  appointedAt: string;
  contractEndDate: string;
  yearsRemaining: number;
  yearsCompleted: number;
  baseSalary: number; // Annual salary
  performanceBonus: number; // Per trophy/league position
  status: 'active' | 'terminated' | 'expired';
}

/**
 * Manager core data
 */
export interface Manager {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  age: number;
  nationality: string;
  managerStatus: ManagerStatus;

  // Skills (0-100)
  tacticalAcumen: number; // Formation/tactic design
  motivationSkill: number; // Player motivation
  youthDevelopment: number; // Academy quality
  marketKnowledge: number; // Transfer skill
  leadershipQuality: number; // Dressing room control

  // Experience
  experience: number; // Years in management
  trophiesWon: number;
  leagueTitles: number;
  cupTitles: number;

  // Personality
  personality: string; // Aggressive, Calm, Charismatic, etc.
  philosophy: string; // Attacking, Balanced, Defensive
  preferredFormation: string; // Default: 4-2-3-1
  notoriety: number; // 0-100 (fame level)

  // Timestamps
  createdAt: string;
  updatedAt: string;
  retiredAt?: string;
}

/**
 * Job offer for manager
 */
export interface JobOffer {
  id: string;
  managerId: string;
  clubId: string;
  position: 'manager' | 'assistant' | 'scout';
  baseSalary: number;
  contractYears: number;
  deadline: string; // Offer valid until this date
  message: string;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  createdAt: string;
}

/**
 * Manager sacking record
 */
export interface SackingRecord {
  id: string;
  managerId: string;
  clubId: string;
  sackReason: 'poor_results' | 'financial' | 'conflict' | 'end_of_contract' | 'retirement' | 'mutual_consent';
  sackDate: string;
  finalLeaguePosition: number;
  winPercentage: number;
  severancePayment: number;
  unemploymentStartDate: string;
}

/**
 * Manager System
 * Complete management of manager lifecycle, employment, and career
 */
export class ManagerSystem {
  private db: SQLiteDBConnection | null = null;

  constructor(db?: SQLiteDBConnection) {
    this.db = db || null;
  }

  // ===== MANAGER CREATION & HIRING =====

  /**
   * Create a new manager
   */
  async createManager(managerData: Partial<Manager>): Promise<Manager | null> {
    if (!this.db) return null;

    try {
      const id = uuidv4();
      const now = new Date();

      const manager: Manager = {
        id,
        firstName: managerData.firstName || 'John',
        lastName: managerData.lastName || 'Manager',
        dateOfBirth: managerData.dateOfBirth || new Date(1970, 0, 1).toISOString(),
        age: managerData.age || 45,
        nationality: managerData.nationality || 'EN',
        managerStatus: 'unemployed',
        tacticalAcumen: managerData.tacticalAcumen || 70 + Math.random() * 25,
        motivationSkill: managerData.motivationSkill || 70 + Math.random() * 25,
        youthDevelopment: managerData.youthDevelopment || 60 + Math.random() * 30,
        marketKnowledge: managerData.marketKnowledge || 70 + Math.random() * 25,
        leadershipQuality: managerData.leadershipQuality || 65 + Math.random() * 30,
        experience: managerData.experience || 15,
        trophiesWon: managerData.trophiesWon || 0,
        leagueTitles: managerData.leagueTitles || 0,
        cupTitles: managerData.cupTitles || 0,
        personality: managerData.personality || ['Aggressive', 'Calm', 'Charismatic'][Math.floor(Math.random() * 3)],
        philosophy: managerData.philosophy || ['Attacking', 'Balanced', 'Defensive'][Math.floor(Math.random() * 3)],
        preferredFormation: managerData.preferredFormation || '4-2-3-1',
        notoriety: managerData.notoriety || 50,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      };

      await this.db.run(
        `INSERT INTO managers (id, first_name, last_name, date_of_birth, age, nationality, manager_status,
                              tactical_acumen, motivation_skill, youth_development, market_knowledge, leadership_quality,
                              experience, trophies_won, league_titles, cup_titles, personality, philosophy,
                              preferred_formation, notoriety, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          manager.id,
          manager.firstName,
          manager.lastName,
          manager.dateOfBirth,
          manager.age,
          manager.nationality,
          manager.managerStatus,
          manager.tacticalAcumen,
          manager.motivationSkill,
          manager.youthDevelopment,
          manager.marketKnowledge,
          manager.leadershipQuality,
          manager.experience,
          manager.trophiesWon,
          manager.leagueTitles,
          manager.cupTitles,
          manager.personality,
          manager.philosophy,
          manager.preferredFormation,
          manager.notoriety,
          manager.createdAt,
          manager.updatedAt,
        ]
      );

      console.log(`👔 Manager created: ${manager.firstName} ${manager.lastName} - ${manager.personality}`);

      return manager;
    } catch (error) {
      console.error('Error creating manager:', error);
      return null;
    }
  }

  /**
   * Hire manager to club
   */
  async hireManager(managerId: string, clubId: string, contractYears: number = 4, baseSalary: number = 2000000): Promise<ManagerContract | null> {
    if (!this.db) return null;

    try {
      const contractId = uuidv4();
      const now = new Date();
      const contractEndDate = new Date(now.getTime() + contractYears * 365 * 24 * 60 * 60 * 1000);

      const contract: ManagerContract = {
        id: contractId,
        managerId,
        clubId,
        appointedAt: now.toISOString(),
        contractEndDate: contractEndDate.toISOString(),
        yearsRemaining: contractYears,
        yearsCompleted: 0,
        baseSalary,
        performanceBonus: baseSalary * 0.25, // 25% of base salary per trophy
        status: 'active',
      };

      // Create contract
      await this.db.run(
        `INSERT INTO manager_contracts (id, manager_id, club_id, appointed_at, contract_end_date, base_salary, status)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [contractId, managerId, clubId, now.toISOString(), contractEndDate.toISOString(), baseSalary, 'active']
      );

      // Update manager status
      await this.db.run(
        `UPDATE managers SET manager_status = 'employed', updated_at = ? WHERE id = ?`,
        [now.toISOString(), managerId]
      );

      console.log(`💼 Manager hired: ${managerId} to ${clubId} for ${contractYears} years at ${baseSalary.toLocaleString()}/year`);

      return contract;
    } catch (error) {
      console.error('Error hiring manager:', error);
      return null;
    }
  }

  // ===== JOB OFFERS =====

  /**
   * Send job offer to manager
   */
  async sendJobOffer(managerId: string, clubId: string, baseSalary: number, contractYears: number = 4): Promise<JobOffer | null> {
    if (!this.db) return null;

    try {
      const offerId = uuidv4();
      const now = new Date();
      const deadline = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7-day offer validity

      const offer: JobOffer = {
        id: offerId,
        managerId,
        clubId,
        position: 'manager',
        baseSalary,
        contractYears,
        deadline: deadline.toISOString(),
        message: `Job offer from ${clubId}: ${baseSalary.toLocaleString()}/year for ${contractYears} years`,
        status: 'pending',
        createdAt: now.toISOString(),
      };

      await this.db.run(
        `INSERT INTO job_offers (id, manager_id, club_id, base_salary, contract_years, deadline, message, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [offerId, managerId, clubId, baseSalary, contractYears, deadline.toISOString(), offer.message, 'pending', now.toISOString()]
      );

      console.log(`📧 Job offer sent to ${managerId}: ${clubId}`);

      return offer;
    } catch (error) {
      console.error('Error sending job offer:', error);
      return null;
    }
  }

  /**
   * Accept job offer
   */
  async acceptJobOffer(offerId: string): Promise<ManagerContract | null> {
    if (!this.db) return null;

    try {
      // const now = new Date(); // For future use if needed

      // Get offer details
      const offerResult = await this.db.query(`SELECT * FROM job_offers WHERE id = ?`, [offerId]);
      const offer = offerResult.values?.[0];

      if (!offer) return null;

      // Hire manager
      const contract = await this.hireManager(offer.manager_id, offer.club_id, offer.contract_years, offer.base_salary);

      // Update offer status
      await this.db.run(`UPDATE job_offers SET status = 'accepted' WHERE id = ?`, [offerId]);

      console.log(`✅ Job offer accepted: ${offer.manager_id} -> ${offer.club_id}`);

      return contract;
    } catch (error) {
      console.error('Error accepting job offer:', error);
      return null;
    }
  }

  /**
   * Reject job offer
   */
  async rejectJobOffer(offerId: string): Promise<boolean> {
    if (!this.db) return false;

    try {
      await this.db.run(`UPDATE job_offers SET status = 'rejected' WHERE id = ?`, [offerId]);
      console.log(`❌ Job offer rejected: ${offerId}`);
      return true;
    } catch (error) {
      console.error('Error rejecting job offer:', error);
      return false;
    }
  }

  /**
   * Get pending job offers for manager
   */
  async getPendingJobOffers(managerId: string): Promise<JobOffer[]> {
    if (!this.db) return [];

    try {
      const result = await this.db.query(
        `SELECT id, manager_id, club_id, base_salary, contract_years, deadline, message, status, created_at
         FROM job_offers
         WHERE manager_id = ? AND status = 'pending' AND deadline > ?
         ORDER BY created_at DESC`,
        [managerId, new Date().toISOString()]
      );

      return (result.values || []).map(row => ({
        id: row.id,
        managerId: row.manager_id,
        clubId: row.club_id,
        position: 'manager',
        baseSalary: row.base_salary,
        contractYears: row.contract_years,
        deadline: row.deadline,
        message: row.message,
        status: row.status,
        createdAt: row.created_at,
      }));
    } catch (error) {
      console.error('Error getting job offers:', error);
      return [];
    }
  }

  // ===== SACKING & UNEMPLOYMENT =====

  /**
   * Sack a manager
   */
  async sackManager(
    managerId: string,
    clubId: string,
    reason: SackingRecord['sackReason'] = 'poor_results',
    finalLeaguePosition: number = 10,
    winPercentage: number = 0.45
  ): Promise<SackingRecord | null> {
    if (!this.db) return null;

    try {
      const recordId = uuidv4();
      const now = new Date();

      // Calculate severance (contract compensation)
      const contractResult = await this.db.query(`SELECT contract_end_date, base_salary FROM manager_contracts WHERE manager_id = ? AND club_id = ?`, [
        managerId,
        clubId,
      ]);
      const contract = contractResult.values?.[0];
      const severancePayment = contract ? (contract.base_salary * 0.5) : 0; // 50% of annual salary

      const sackingRecord: SackingRecord = {
        id: recordId,
        managerId,
        clubId,
        sackReason: reason,
        sackDate: now.toISOString(),
        finalLeaguePosition,
        winPercentage,
        severancePayment,
        unemploymentStartDate: now.toISOString(),
      };

      // Record sacking
      await this.db.run(
        `INSERT INTO manager_sackings (id, manager_id, club_id, sack_reason, sack_date, final_league_position, win_percentage, severance_payment)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [recordId, managerId, clubId, reason, now.toISOString(), finalLeaguePosition, winPercentage, severancePayment]
      );

      // Terminate contract
      await this.db.run(
        `UPDATE manager_contracts SET status = 'terminated' WHERE manager_id = ? AND club_id = ?`,
        [managerId, clubId]
      );

      // Update manager status to unemployed
      await this.db.run(
        `UPDATE managers SET manager_status = 'unemployed', updated_at = ? WHERE id = ?`,
        [now.toISOString(), managerId]
      );

      console.log(`🔴 Manager sacked: ${managerId} from ${clubId} - Reason: ${reason}, Severance: ${severancePayment.toLocaleString()}`);

      return sackingRecord;
    } catch (error) {
      console.error('Error sacking manager:', error);
      return null;
    }
  }

  /**
   * Get manager's employment history
   */
  async getManagerEmploymentHistory(managerId: string): Promise<{
    currentClub?: ManagerContract;
    previousClubs: SackingRecord[];
    jobOffers: JobOffer[];
  }> {
    if (!this.db) {
      return { previousClubs: [], jobOffers: [] };
    }

    try {
      // Get current contract
      const currentResult = await this.db.query(
        `SELECT id, club_id, appointed_at, contract_end_date, base_salary FROM manager_contracts
         WHERE manager_id = ? AND status = 'active'`,
        [managerId]
      );

      const currentClub = currentResult.values?.[0];

      // Get sacking history
      const sackingsResult = await this.db.query(
        `SELECT id, club_id, sack_reason, sack_date, final_league_position, win_percentage, severance_payment
         FROM manager_sackings WHERE manager_id = ? ORDER BY sack_date DESC`,
        [managerId]
      );

      const previousClubs = (sackingsResult.values || []).map(row => ({
        id: row.id,
        managerId,
        clubId: row.club_id,
        sackReason: row.sack_reason,
        sackDate: row.sack_date,
        finalLeaguePosition: row.final_league_position,
        winPercentage: row.win_percentage,
        severancePayment: row.severance_payment,
        unemploymentStartDate: row.sack_date,
      }));

      // Get pending offers
      const offersResult = await this.db.query(
        `SELECT id, club_id, base_salary, contract_years, deadline, message, status, created_at
         FROM job_offers WHERE manager_id = ? ORDER BY created_at DESC`,
        [managerId]
      );

      const jobOffers = (offersResult.values || []).map(row => ({
        id: row.id,
        managerId,
        clubId: row.club_id,
        position: 'manager' as const,
        baseSalary: row.base_salary,
        contractYears: row.contract_years,
        deadline: row.deadline,
        message: row.message,
        status: row.status,
        createdAt: row.created_at,
      }));

      return {
        currentClub: currentClub
          ? {
              id: currentClub.id,
              managerId,
              clubId: currentClub.club_id,
              appointedAt: currentClub.appointed_at,
              contractEndDate: currentClub.contract_end_date,
              yearsRemaining: Math.ceil((new Date(currentClub.contract_end_date).getTime() - new Date().getTime()) / (365 * 24 * 60 * 60 * 1000)),
              yearsCompleted: Math.floor((new Date().getTime() - new Date(currentClub.appointed_at).getTime()) / (365 * 24 * 60 * 60 * 1000)),
              baseSalary: currentClub.base_salary,
              performanceBonus: currentClub.base_salary * 0.25,
              status: 'active',
            }
          : undefined,
        previousClubs,
        jobOffers,
      };
    } catch (error) {
      console.error('Error getting employment history:', error);
      return { previousClubs: [], jobOffers: [] };
    }
  }

  setDatabase(db: SQLiteDBConnection): void {
    this.db = db;
  }
}

export default ManagerSystem;
