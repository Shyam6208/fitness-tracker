from fastapi import FastAPI, APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from pydantic import BaseModel, Field, ConfigDict, field_validator
from typing import List, Optional, Dict, Any
from pathlib import Path
from datetime import datetime, timezone
import base64
import json
import logging
import os
import requests
import uuid

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

app = FastAPI(title='FitPro Market API (In-Memory)')
api_router = APIRouter(prefix='/api')
security = HTTPBearer(auto_error=False)

GEMINI_API_KEY = os.getenv('GEMINI_API_KEY', '').strip()
GEMINI_MODEL = os.getenv('GEMINI_MODEL', 'gemini-1.5-flash').strip()
GEMINI_TIMEOUT_SECONDS = 45

logger = logging.getLogger(__name__)


class UserProfile(BaseModel):
    model_config = ConfigDict(extra='ignore')
    email: str
    name: str
    fitness_goal: Optional[str] = None
    age: Optional[int] = None
    weight: Optional[float] = None
    height: Optional[float] = None
    experience_level: Optional[str] = None


class UpdateProfile(BaseModel):
    name: Optional[str] = None
    fitness_goal: Optional[str] = None
    age: Optional[int] = None
    weight: Optional[float] = None
    height: Optional[float] = None
    experience_level: Optional[str] = None


class WorkoutRequest(BaseModel):
    goal: Optional[str] = None
    experience_level: Optional[str] = None
    days_per_week: Optional[int] = None
    use_profile: bool = False

    @field_validator('days_per_week')
    @classmethod
    def validate_days(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and (v < 1 or v > 7):
            raise ValueError('Days per week must be between 1 and 7')
        return v


class DietRequest(BaseModel):
    goal: str
    weight: float
    height: float
    dietary_preferences: Optional[str] = None


class ChatMessage(BaseModel):
    message: str
    session_id: Optional[str] = None


class SupplementRecommendationRequest(BaseModel):
    goal: str
    experience_level: str


class ProgressEntry(BaseModel):
    model_config = ConfigDict(extra='ignore')
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    date: str
    workout_completed: bool
    notes: Optional[str] = None
    weight: Optional[float] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class ProgressCreate(BaseModel):
    date: str
    workout_completed: bool
    notes: Optional[str] = None
    weight: Optional[float] = None


class Product(BaseModel):
    model_config = ConfigDict(extra='ignore')
    id: str
    name: str
    description: str
    category: str
    price: float
    image_url: str
    rating: float
    reviews_count: int
    stock: int
    goals: List[str] = []


class CartItem(BaseModel):
    product_id: str
    quantity: int


class CartItemResponse(BaseModel):
    model_config = ConfigDict(extra='ignore')
    product_id: str
    quantity: int
    product: Optional[Product] = None


class Review(BaseModel):
    model_config = ConfigDict(extra='ignore')
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    product_id: str
    user_id: str
    user_name: str
    rating: int
    comment: str
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class ReviewCreate(BaseModel):
    rating: int
    comment: str


class CheckoutRequest(BaseModel):
    origin_url: str


class Order(BaseModel):
    model_config = ConfigDict(extra='ignore')
    id: str
    user_id: str
    items: List[Dict[str, Any]]
    total: float
    status: str
    stripe_session_id: str
    created_at: str


USERS_BY_ID: Dict[str, Dict[str, Any]] = {}
USERS_BY_UID: Dict[str, str] = {}
PROGRESS_BY_USER: Dict[str, List[Dict[str, Any]]] = {}
CART_BY_USER: Dict[str, List[Dict[str, Any]]] = {}
ORDERS_BY_USER: Dict[str, List[Dict[str, Any]]] = {}
REVIEWS_BY_PRODUCT: Dict[str, List[Dict[str, Any]]] = {}
PAYMENT_SESSIONS: Dict[str, Dict[str, Any]] = {}


CATEGORY_GOALS = {
    'protein': ['muscle_gain', 'strength', 'general_fitness'],
    'creatine': ['muscle_gain', 'strength', 'endurance'],
    'pre-workout': ['strength', 'endurance', 'general_fitness'],
    'bcaa': ['muscle_gain', 'endurance', 'general_fitness'],
    'vitamins': ['general_fitness', 'weight_loss', 'endurance'],
    'fat-burner': ['weight_loss', 'endurance', 'general_fitness'],
}

IMAGE_POOL = {
    'protein': [
        # Protein powder tubs/jars – warm studio shots, white/dark backgrounds
        'https://images.unsplash.com/photo-1593095948071-474c5cc2c129?w=800&q=80',   # white protein tub
        'https://images.unsplash.com/photo-1579722821273-0f6c6d44362f?w=800&q=80',   # protein jar dark bg
        'https://images.unsplash.com/photo-1543353071-873f17a7a088?w=800&q=80',      # supplement scoop
        'https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?w=800&q=80',   # gym athlete shaker
        'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&q=80',   # protein shake glass
        'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=800&q=80',   # gym powder scoop
        'https://images.unsplash.com/photo-1594381898411-846e7d193883?w=800&q=80',   # supplement container
        'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80',   # gym training
        'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800&q=80',   # gym equipment dark
        'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=800&q=80',   # supplement capsules
        'https://images.unsplash.com/photo-1611073615830-9b028ac1c20a?w=800&q=80',   # protein scoop powder
        'https://images.unsplash.com/photo-1499084732479-de2c02d45fcc?w=800&q=80',   # fitness supplement
        'https://images.unsplash.com/photo-1544216428-b90bdb4ccb90?w=800&q=80',      # nutrition label
        'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=800&q=80',   # bodybuilder diet
        'https://images.unsplash.com/photo-1505576457997-5f7d9ee4f0f9?w=800&q=80',   # healthy protein food
    ],
    'creatine': [
        'https://images.unsplash.com/photo-1579722820903-a8878e6b567a?w=800&q=80',   # white powder tub
        'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800&q=80',   # dark gym
        'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=800&q=80',   # scoop powder
        'https://images.unsplash.com/photo-1534258936925-c58bed479fcb?w=800&q=80',   # gym training energy
        'https://images.unsplash.com/photo-1549060279-7e168fcee0c2?w=800&q=80',      # weightlifter strength
        'https://images.unsplash.com/photo-1590487988256-9ed24133863e?w=800&q=80',   # creatine powder close
        'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800&q=80',   # gym ambiance
        'https://images.unsplash.com/photo-1576678927484-cc907957088c?w=800&q=80',   # gym dumbbell
        'https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?w=800&q=80',   # barbell athlete
        'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&q=80',   # strength training
        'https://images.unsplash.com/photo-1540497077202-7c8a3999166f?w=800&q=80',   # gym weights
        'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=800&q=80',      # supplement shaker
        'https://images.unsplash.com/photo-1599058917212-d750089bc07e?w=800&q=80',   # gym performance
        'https://images.unsplash.com/photo-1574680178050-55c6a6a96e9d?w=800&q=80',   # powerlifting
        'https://images.unsplash.com/photo-1605296867304-46d5465a13f1?w=800&q=80',   # supplement tub
    ],
    'pre-workout': [
        'https://images.unsplash.com/photo-1594381898411-846e7d193883?w=800&q=80',   # supplement container red
        'https://images.unsplash.com/photo-1534258936925-c58bed479fcb?w=800&q=80',   # energetic athlete
        'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=800&q=80',   # gym session
        'https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?w=800&q=80',   # intense training
        'https://images.unsplash.com/photo-1549060279-7e168fcee0c2?w=800&q=80',      # explosive lifting
        'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&q=80',   # performance athlete
        'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?w=800&q=80',   # gym energy
        'https://images.unsplash.com/photo-1540497077202-7c8a3999166f?w=800&q=80',   # fitness supplement
        'https://images.unsplash.com/photo-1574680178050-55c6a6a96e9d?w=800&q=80',   # barbell session
        'https://images.unsplash.com/photo-1576678927484-cc907957088c?w=800&q=80',   # gym iron
        'https://images.unsplash.com/photo-1599058917212-d750089bc07e?w=800&q=80',   # training fuel
        'https://images.unsplash.com/photo-1605296867304-46d5465a13f1?w=800&q=80',   # pre-workout tub
        'https://images.unsplash.com/photo-1560347876-aeef00ee58a1?w=800&q=80',      # energy drink
        'https://images.unsplash.com/photo-1586401100295-7a8096fd231a?w=800&q=80',   # workout energy
        'https://images.unsplash.com/photo-1518310383802-640c2de311b2?w=800&q=80',   # neon gym aesthetic
    ],
    'bcaa': [
        'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=800&q=80',      # shaker bottle
        'https://images.unsplash.com/photo-1593476123561-9516f2097158?w=800&q=80',   # supplement bottles
        'https://images.unsplash.com/photo-1517964603305-11c0f6f66012?w=800&q=80',   # gym hydration
        'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80',   # intra workout
        'https://images.unsplash.com/photo-1576678927484-cc907957088c?w=800&q=80',   # gym recovery
        'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&q=80',   # endurance athlete
        'https://images.unsplash.com/photo-1579722821273-0f6c6d44362f?w=800&q=80',   # amino powder
        'https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?w=800&q=80',   # active training
        'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?w=800&q=80',   # recovery session
        'https://images.unsplash.com/photo-1549060279-7e168fcee0c2?w=800&q=80',      # muscle recovery
        'https://images.unsplash.com/photo-1599058917212-d750089bc07e?w=800&q=80',   # sport nutrition
        'https://images.unsplash.com/photo-1590487988256-9ed24133863e?w=800&q=80',   # amino acids
        'https://images.unsplash.com/photo-1540497077202-7c8a3999166f?w=800&q=80',   # gym supplement
        'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=800&q=80',   # sports hydration
        'https://images.unsplash.com/photo-1607627000458-210e8d2bdb1d?w=800&q=80',   # recovery powder
    ],
    'vitamins': [
        'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=800&q=80',   # vitamin capsules
        'https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=800&q=80',   # health supplements
        'https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=800&q=80',   # healthy food vitamins
        'https://images.unsplash.com/photo-1543362906-acfc16c67564?w=800&q=80',      # omega fish oil
        'https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=800&q=80',   # vitamin D tablets
        'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=800&q=80',   # supplement pills
        'https://images.unsplash.com/photo-1550572017-4fcdbb59cc32?w=800&q=80',      # wellness capsules
        'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=800&q=80',      # healthcare supplements
        'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=800&q=80',   # natural vitamins
        'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&q=80',   # healthy greens nutrition
        'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800&q=80',   # healthy meal prep
        'https://images.unsplash.com/photo-1505253758473-96b7015fcd40?w=800&q=80',   # magnesium zinc
        'https://images.unsplash.com/photo-1571019613914-85f342c6a11e?w=800&q=80',   # b-vitamins
        'https://images.unsplash.com/photo-1576086213369-97a306d36557?w=800&q=80',   # health wellness
        'https://images.unsplash.com/photo-1607990281513-2c110a25bd8c?w=800&q=80',   # daily supplements
    ],
    'fat-burner': [
        'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&q=80',   # lean diet food
        'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800&q=80',   # meal prep weight loss
        'https://images.unsplash.com/photo-1490474418585-ba9bad8fd0ea?w=800&q=80',   # healthy nutrition
        'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=800&q=80',   # cardio workout
        'https://images.unsplash.com/photo-1534258936925-c58bed479fcb?w=800&q=80',   # fat burn cardio
        'https://images.unsplash.com/photo-1576678927484-cc907957088c?w=800&q=80',   # weight training cut
        'https://images.unsplash.com/photo-1549060279-7e168fcee0c2?w=800&q=80',      # shredding training
        'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&q=80',   # lean athlete
        'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?w=800&q=80',   # shred session
        'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=800&q=80',      # thermogenic drink
        'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=800&q=80',   # fat burner capsules
        'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=800&q=80',   # supplement pills lean
        'https://images.unsplash.com/photo-1574680178050-55c6a6a96e9d?w=800&q=80',   # cutting phase
        'https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?w=800&q=80',   # fat loss training
        'https://images.unsplash.com/photo-1599058917212-d750089bc07e?w=800&q=80',   # body recomp
    ],
}


PRODUCT_NAMES = {
    'protein': [
        'Whey Isolate Gold', 'Hydro Whey Elite', 'Casein Night Recovery', 'Plant Protein Matrix',
        'Mass Gainer Pro', 'Lean Protein Blend', 'Grass-Fed Whey Pure', 'Protein Crunch Formula',
        'Lactose-Free Whey', 'Vanilla Recover Protein', 'Chocolate Muscle Protein', 'Clear Protein Isolate',
        'Dual-Phase Protein', 'Ultra Digest Protein', 'Performance Protein X'
    ],
    'creatine': [
        'Creatine Monohydrate Core', 'Micronized Creatine Plus', 'Creatine HCL Max', 'Creapure Strength',
        'Creatine Endurance Lab', 'Creatine Recovery Drive', 'Buffered Creatine Power', 'Creatine ATP Focus',
        'Unflavored Creatine Stack', 'Creatine 5000', 'Creatine Nitro Blend', 'Creatine Reload',
        'Creatine Hybrid Pro', 'Creatine Daily Build', 'Creatine Peak Output'
    ],
    'pre-workout': [
        'Pre-Workout Ignite', 'Explosive Energy Shot', 'Pump Matrix Pre', 'Focus Drive Pre-Workout',
        'Nitric Boost Formula', 'Extreme Session Fuel', 'Pre-Lift Catalyst', 'Stimulant-Free Pump',
        'Energy Surge Pre', 'Power Start Blend', 'Max Rep Pre-Workout', 'Athlete Launch Pre',
        'Pre-Workout Alpha', 'Redline Performance Pre', 'Vascular Pump Pro'
    ],
    'bcaa': [
        'BCAA 2:1:1 Recovery', 'Intra-Workout BCAA+', 'Electrolyte BCAA Hydrate', 'Zero Sugar BCAA',
        'BCAA Endurance Mix', 'BCAA Leucine Max', 'BCAA Reload', 'BCAA Muscle Shield',
        'BCAA Fast Absorb', 'Fermented BCAA Core', 'BCAA Hydration Pro', 'BCAA Night Repair',
        'BCAA Energy Fusion', 'BCAA Recovery Stack', 'BCAA Amino Prime'
    ],
    'vitamins': [
        'Daily Multivitamin Max', 'Active Men Formula', 'Active Women Formula', 'Immune Defense Complex',
        'Vitamin D3 + K2', 'Magnesium Recovery', 'Zinc Performance Support', 'Omega 3 Ultra',
        'Joint Care Essentials', 'B-Complex Energy', 'Electrolyte Mineral Plus', 'Greens Micronutrient Blend',
        'Antioxidant Shield', 'Sleep & Recovery Minerals', 'Comprehensive Health Pack'
    ],
    'fat-burner': [
        'Thermo Burn Elite', 'Lean Cut Accelerator', 'Metabolic Boost Stack', 'Shred Matrix Formula',
        'Cardio Burn Fuel', 'Fat Oxidation Plus', 'Cutting Phase Support', 'L-Carnitine Drive',
        'Thermo Focus Advanced', 'Appetite Control Blend', 'Green Tea Burn Complex', 'Daytime Fat Burner',
        'Stimulant-Free Burner', 'Core Shred Formula', 'Body Recomp Catalyst'
    ],
}


PRODUCT_DESCRIPTIONS = {
    # Protein
    'Whey Isolate Gold': '90% protein per serving, ultra-filtered whey isolate with less than 1g of fat and sugar. Rapid amino acid delivery for post-workout muscle recovery. 25 servings per container.',
    'Hydro Whey Elite': 'Hydrolized whey peptides for the fastest absorption rate in the whey protein category. Pre-digested for superior bioavailability, ideal for athletes requiring rapid post-exercise recovery.',
    'Casein Night Recovery': 'Micellar casein delivers a slow, sustained release of amino acids over 6-8 hours. Perfect before bed to fuel overnight muscle repair and minimize catabolism. 24g protein per scoop.',
    'Plant Protein Matrix': 'Tri-blend of pea, brown rice & hemp protein delivering a complete amino acid profile. Certified vegan, soy-free and gluten-free. 20g clean plant protein per serving.',
    'Mass Gainer Pro': '1250 calories per serving with 50g protein and 250g complex carbs. Engineered for hard gainers who struggle to consume enough calories through whole foods alone.',
    'Lean Protein Blend': 'Multi-phase protein blend (whey concentrate + isolate + casein) providing 30g protein with only 130 calories. Ideal for body recomposition and lean muscle building.',
    'Grass-Fed Whey Pure': 'Sourced exclusively from grass-fed, hormone-free cows. Rich in CLA and naturally occurring omega-3s. Minimal processing preserves naturally occurring growth factors.',
    'Protein Crunch Formula': 'Crispy, high-protein formula that mixes into a thick, dessert-like shake. 27g protein per serving with added digestive enzymes to reduce bloating.',
    'Lactose-Free Whey': '100% whey isolate processed to remove all lactose. Smooth, gentle on digestion and perfect for those with dairy sensitivities. No compromises on protein quality.',
    'Vanilla Recover Protein': 'Premium Tahitian vanilla flavor with 25g of whey and casein blend. Added BCAAs and glutamine accelerate recovery between training sessions.',
    'Chocolate Muscle Protein': 'Rich Belgian chocolate flavor with 28g protein per serving. Enhanced with MCT oil and cocoa flavanols for an antioxidant boost alongside your protein.',
    'Clear Protein Isolate': 'Refreshing, juice-like protein experience. 20g of crystal-clear whey isolate that mixes like a sports drink - zero grittiness, zero milky texture.',
    'Dual-Phase Protein': 'Fast-acting whey isolate combined with slow-release casein for a sustained 8-hour amino release. Ideal as both a post-workout and meal replacement option.',
    'Ultra Digest Protein': 'Enhanced with ProHydrolase enzyme blend to maximize protein digestion by up to 30%. Reduces discomfort and ensures complete amino acid uptake.',
    'Performance Protein X': 'Professional-grade formulation with 32g protein, added creatine monohydrate and beta-alanine. The all-in-one stack for serious strength and performance athletes.',
    # Creatine
    'Creatine Monohydrate Core': 'The gold-standard Creapure-grade creatine monohydrate. 5g per serving, unflavored and micronized for instant mixing. Clinically proven to increase strength and power output.',
    'Micronized Creatine Plus': 'Ultra-fine 200-mesh micronization for superior solubility and absorption. No chalky residue - dissolves completely in water. 5g of pure creatine per scoop.',
    'Creatine HCL Max': 'Creatine hydrochloride requires a smaller dose (1-2g) vs monohydrate with zero loading phase and no water retention. Ideal for those sensitive to bloating.',
    'Creapure Strength': 'Sourced from AlzChems patented Creapure facility in Germany - the highest purity creatine available. Third-party tested, 99.99% pure.',
    'Creatine Endurance Lab': 'Combines 5g creatine monohydrate with 3g beta-alanine for concurrent strength and endurance benefits. Supports both the phosphocreatine system and carnosine buffering.',
    'Creatine Recovery Drive': 'Post-workout creatine formula blended with electrolytes and taurine to replenish cellular ATP stores and accelerate muscle glycogen resynthesis.',
    'Buffered Creatine Power': 'Kre-Alkalyn pH-buffered creatine remains stable in stomach acid for superior uptake. No bloating, no loading required, no crash.',
    'Creatine ATP Focus': 'Combines creatine monohydrate with ribose and magnesium glycinate to support the full ATP energy cycle. Clinically dosed at 5g creatine per serving.',
    'Unflavored Creatine Stack': 'Pure, unflavored creatine that mixes invisibly into any drink or protein shake. Stackable with any supplement without affecting flavor or texture.',
    'Creatine 5000': 'Exactly 5,000mg of pharmaceutical-grade creatine monohydrate per serving. Simple, clean, effective - nothing else added.',
    'Creatine Nitro Blend': 'Creatine monohydrate infused with Nitrosigine for enhanced nitric oxide production. Experience superior pumps alongside raw strength gains.',
    'Creatine Reload': 'Post-workout creatine paired with fast carbs (dextrose) to spike insulin and drive creatine into muscle cells rapidly. Ideal for the post-training window.',
    'Creatine Hybrid Pro': 'Tri-creatine blend of monohydrate, HCL and ethyl ester for multi-pathway saturation. Faster loading, sustained levels throughout the day.',
    'Creatine Daily Build': 'Low-dose, 3g daily creatine designed for consistent, long-term maintenance supplementation. No cycling needed. Ideal for daily athletes.',
    'Creatine Peak Output': 'High-output formula with 8g creatine for extreme power sports, sprint athletes and heavy powerlifters. Stacked with HMB for anti-catabolic support.',
    # Pre-Workout
    'Pre-Workout Ignite': '300mg caffeine + L-theanine for clean, crash-free energy. 6g citrulline malate for maximum pumps. No proprietary blends - fully transparent label.',
    'Explosive Energy Shot': 'Concentrated 2oz liquid pre-workout delivering 200mg caffeine, 3g beta-alanine and B-vitamins in seconds. No mixing required, carry anywhere.',
    'Pump Matrix Pre': 'Stimulant-free pre-workout with 8g L-citrulline, 2.5g betaine and Nitrosigine for skin-splitting pumps without any caffeine-driven jitteriness.',
    'Focus Drive Pre-Workout': 'Nootropic-enhanced pre-workout with 200mg caffeine, 400mg alpha-GPC and lions mane extract. Enhances mind-muscle connection and workout focus.',
    'Nitric Boost Formula': 'Maximum-dose nitric oxide formula: 10g L-citrulline + 600mg agmatine sulfate. Engineered for peak vasodilation and muscle volumization.',
    'Extreme Session Fuel': 'High-stim pre-workout for experienced users. 350mg caffeine anhydrous, 1.5mg yohimbine, 5g beta-alanine, and 6g citrulline. Not for beginners.',
    'Pre-Lift Catalyst': 'Fully dosed pre-workout with 175mg caffeine for moderate energy, 4g citrulline and creatine monohydrate. The complete lifting stack in one scoop.',
    'Stimulant-Free Pump': 'Zero caffeine, all pump. Perfect for evening training or caffeine-sensitive athletes. 8g citrulline, 2g arginine nitrate, and pink Himalayan salt.',
    'Energy Surge Pre': 'Naturally sourced energy from green tea extract (200mg EGCG) and coffeeberry for smooth, jitter-free workout energy without synthetic stimulants.',
    'Power Start Blend': 'Moderate-stim formula with 200mg caffeine, 3.2g beta-alanine and 5g creatine. The starter pre-workout for those building their tolerance.',
    'Max Rep Pre-Workout': 'Formulated around the key ingredients proven in clinical studies: 6g citrulline, 3.2g beta-alanine, 1.6g betaine, 200mg caffeine. Science first.',
    'Athlete Launch Pre': 'NSF Certified for Sport - tested clean for 270+ banned substances. Safe for competing athletes. 200mg caffeine, 4g citrulline, full B-vitamin profile.',
    'Pre-Workout Alpha': 'Alpha-GPC enhanced formula for heightened cognitive focus during training. 200mg caffeine + 600mg alpha-GPC + 5g creatine per serving.',
    'Redline Performance Pre': 'Professional-grade matrix targeting high-intensity interval athletes. Combines caffeine, electrolytes, citrulline, and taurine for performance and hydration.',
    'Vascular Pump Pro': 'Targets maximum blood flow with 10g L-citrulline, 3g L-arginine, beetroot extract (500mg), and pine bark extract. Stimulant-free vascular expansion.',
    # BCAA
    'BCAA 2:1:1 Recovery': 'Optimal 2:1:1 leucine:isoleucine:valine ratio - the clinically validated BCAA ratio for maximum muscle protein synthesis. 7g BCAAs per serving.',
    'Intra-Workout BCAA+': 'Designed for sipping during training. 5g BCAAs + 3g glutamine + electrolytes to prevent muscle breakdown, maintain hydration and extend performance.',
    'Electrolyte BCAA Hydrate': 'Hydration-focused formula combining 5g BCAAs with sodium, potassium, magnesium and coconut water powder. Combat cramps and power endurance.',
    'Zero Sugar BCAA': 'Naturally sweetened with stevia and monk fruit. Zero sugar, zero calories, zero artificial colors. 7g BCAAs in a refreshing fruit punch flavor.',
    'BCAA Endurance Mix': '4:1:1 leucine-heavy formula for endurance athletes. Higher leucine dose maintains MPS during long cardio sessions, reducing muscle fiber damage.',
    'BCAA Leucine Max': 'Leucine-amplified formula with 5g leucine per serving - clinically the most important BCAA for triggering muscle protein synthesis. Enhanced with vitamin D3.',
    'BCAA Reload': 'Post-workout BCAA formula with added tart cherry extract (500mg) to reduce delayed onset muscle soreness (DOMS) and accelerate recovery time.',
    'BCAA Muscle Shield': 'Anti-catabolic formula combining 7g BCAAs with 3g HMB (beta-hydroxy beta-methylbutyrate) to minimize muscle tissue breakdown during caloric deficits.',
    'BCAA Fast Absorb': 'Free-form amino acids for instant absorption without digestion. Ideal consumed immediately before or during training for real-time muscle protection.',
    'Fermented BCAA Core': 'Plant-fermented BCAAs sourced 100% from non-GMO, vegan fermentation - not animal keratin or hair. Same efficacy, ethical sourcing, fully transparent.',
    'BCAA Hydration Pro': 'Sport drink-style BCAA with 5g aminos, full electrolyte panel and added vitamin C. Functions as an intra-workout hydration and recovery beverage.',
    'BCAA Night Repair': 'Nighttime recovery formula: 7g BCAAs with 200mg magnesium glycinate and L-glycine. Taken before bed to support overnight muscle protein synthesis.',
    'BCAA Energy Fusion': 'BCAAs blended with 100mg natural caffeine (from coffeeberry) and B-vitamins for a light energy boost alongside amino acid support.',
    'BCAA Recovery Stack': 'Comprehensive recovery formula stacking BCAAs, glutamine, citrulline and electrolytes into one intra/post-workout product. Simplify your supplement stack.',
    'BCAA Amino Prime': 'Clinical-dose BCAA featuring EAA co-support (9 essential amino acids) alongside BCAAs, offering a more complete amino acid profile for elite-level recovery.',
    # Vitamins
    'Daily Multivitamin Max': 'Comprehensive 30-nutrient formula covering all essential vitamins and minerals. Includes methylated B12 and folate for superior bioavailability. One daily capsule.',
    'Active Men Formula': 'Formulated specifically for active males: higher zinc (15mg) for testosterone support, B-complex for energy, vitamin D3 (3000IU) and lycopene for prostate health.',
    'Active Women Formula': 'Women-specific multivitamin with iron (18mg), folate (400mcg), vitamin K2 for bone density, and evening primrose oil for hormonal balance.',
    'Immune Defense Complex': 'High-potency immune stack: vitamin C (1000mg), zinc (25mg), vitamin D3 (5000IU), elderberry extract and echinacea. Daily immune system defense.',
    'Vitamin D3 + K2': '5000IU D3 paired with 100mcg MK-7 form of K2 to ensure calcium is deposited in bones, not arteries. The essential duo for bone and cardiovascular health.',
    'Magnesium Recovery': 'Magnesium glycinate - the most bioavailable, gentle form. 400mg elemental magnesium per serving. Reduces muscle cramps, improves sleep quality and recovery.',
    'Zinc Performance Support': '30mg zinc picolinate - the superior absorbed form. Supports testosterone levels, immune function, protein synthesis and wound healing.',
    'Omega 3 Ultra': 'Triple-strength fish oil delivering 2400mg EPA + DHA per two softgels. Molecularly distilled to remove heavy metals and PCBs. IFOS certified purity.',
    'Joint Care Essentials': 'Comprehensive joint stack: 1500mg glucosamine sulfate, 1200mg chondroitin, 500mg MSM, 100mg type II collagen and 15mg hyaluronic acid.',
    'B-Complex Energy': 'Full spectrum B-vitamin complex with methylated B12 (1000mcg) and methylfolate. Supports energy metabolism, neurological health and stress resilience.',
    'Electrolyte Mineral Plus': 'Balanced electrolyte formula: sodium, potassium, magnesium, calcium and trace minerals. Ideal for athletes losing electrolytes through sweat.',
    'Greens Micronutrient Blend': '35 whole-food greens, vegetables & sprouts in one convenient scoop. Supports alkalinity, digestion and daily micronutrient intake without the prep.',
    'Antioxidant Shield': 'Powerful antioxidant complex: vitamin E (400IU), vitamin C (1000mg), CoQ10 (100mg), alpha-lipoic acid (300mg) and resveratrol. Combats oxidative stress.',
    'Sleep & Recovery Minerals': 'Natural sleep support: magnesium glycinate (400mg), zinc (10mg), ashwagandha KSM-66 (600mg) and L-glycine. Promotes deep sleep and muscle repair.',
    'Comprehensive Health Pack': 'All-in-one daily health packet with multivitamin, omega-3, vitamin D3/K2, and probiotic. Everything your body needs, perfectly portioned for daily use.',
    # Fat Burner
    'Thermo Burn Elite': 'Advanced thermogenic with 300mg caffeine, 500mg green tea extract (EGCG), 100mg capsaicin and 2mg synephrine. Clinically supported fat oxidation ingredients.',
    'Lean Cut Accelerator': 'Moderate-stim fat burner with 200mg caffeine, 500mg green coffee bean extract and 200mg L-carnitine. Supports metabolism and lipid mobilization.',
    'Metabolic Boost Stack': 'Stims-free metabolic enhancer using cayenne pepper extract, green tea EGCG, and conjugated linoleic acid (CLA) to naturally elevate metabolic rate.',
    'Shred Matrix Formula': '8-stage fat loss matrix combining caffeine, L-carnitine, raspberry ketones, CLA, green tea, cayenne, white willow bark and chromium picolinate.',
    'Cardio Burn Fuel': 'Formulated for cardio sessions: sustained energy + enhanced fat oxidation. 150mg caffeine, 2g L-carnitine and B-vitamins to maximize calorie burn during cardio.',
    'Fat Oxidation Plus': 'L-carnitine L-tartrate (2000mg) + coenzyme A precursors to shuttle fatty acids into mitochondria for energy. Stimulant-free, ideal for fasted cardio.',
    'Cutting Phase Support': 'Comprehensive cutting formula targeting appetite, energy and fat metabolism: glucomannan (fiber), 200mg caffeine, coleus forskohlii and cayenne.',
    'L-Carnitine Drive': 'Pharmaceutical-grade L-Carnitine L-Tartrate at 3000mg per serving. Supports fatty acid oxidation, reduces exercise-induced muscle damage and enhances recovery.',
    'Thermo Focus Advanced': 'Cognitive and thermogenic formula: 250mg caffeine, 200mg L-theanine for focus balance, plus green tea, ginger root and black pepper extract.',
    'Appetite Control Blend': 'Satiety-focused formula with glucomannan (3g), 5-HTP (50mg), chromium picolinate and berberine to support healthy appetite and blood sugar balance.',
    'Green Tea Burn Complex': 'High-potency green tea standardized to 50% EGCG. 1000mg providing 500mg EGCG plus catechins. Supports fat oxidation and provides antioxidant protection.',
    'Daytime Fat Burner': 'All-day metabolic support without afternoon crashes. Time-released caffeine matrix with thyroid-supporting iodine, selenium and L-tyrosine.',
    'Stimulant-Free Burner': 'Zero stimulant, zero jitters. CLA (3g), acetyl L-carnitine (2g) and green tea without caffeine. Safe for use twice daily and before bed.',
    'Core Shred Formula': 'Targets visceral/abdominal fat through cortisol management with ashwagandha (600mg KSM-66), phosphatidylserine (400mg) and chromium picolinate.',
    'Body Recomp Catalyst': 'Simultaneous fat loss and muscle preservation stack. HMB (3g) prevents catabolism while CLA and L-carnitine support lipid mobilization. The definitive recomp formula.',
}


def build_products() -> List[Dict[str, Any]]:
    products: List[Dict[str, Any]] = []
    for category, names in PRODUCT_NAMES.items():
        goals = CATEGORY_GOALS[category]
        for idx, name in enumerate(names):
            image_url = build_product_image_url(category, name, idx)
            description = PRODUCT_DESCRIPTIONS.get(
                name,
                f'{name} is a premium {category} supplement engineered for {goals[0].replace("_", " ")} — formulated with quality ingredients for consistent, measurable results.'
            )
            products.append({
                'id': str(uuid.uuid4()),
                'name': name,
                'description': description,
                'category': category,
                'price': round(19.99 + (idx * 2.15) + (len(category) * 0.2), 2),
                'image_url': image_url,
                'rating': min(round(4.2 + (idx % 7) * 0.1, 1), 4.9),
                'reviews_count': 80 + (idx * 17),
                'stock': 120 + (idx * 5),
                'goals': goals,
            })
    return products


def build_product_image_url(category: str, product_name: str, idx: int) -> str:
    """Return a curated, real Unsplash image URL for the given product category and index."""
    pool = IMAGE_POOL.get(category, IMAGE_POOL['protein'])
    return pool[idx % len(pool)]


PRODUCTS = build_products()
PRODUCTS_BY_ID = {p['id']: p for p in PRODUCTS}


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def parse_token_payload(token: str) -> Dict[str, Any]:
    try:
        parts = token.split('.')
        if len(parts) < 2:
            return {}
        payload = parts[1]
        payload += '=' * (-len(payload) % 4)
        decoded = base64.urlsafe_b64decode(payload.encode('utf-8')).decode('utf-8')
        return json.loads(decoded)
    except Exception:
        return {}


def get_or_create_user_from_token(token: str) -> Dict[str, Any]:
    payload = parse_token_payload(token)
    uid = str(payload.get('sub') or payload.get('uid') or f'demo-{abs(hash(token)) % 1000000}')
    email = str(payload.get('email') or f'{uid}@fitpro.local')
    name = str(payload.get('name') or email.split('@')[0].replace('.', ' ').title())

    if uid in USERS_BY_UID:
        return USERS_BY_ID[USERS_BY_UID[uid]]

    user_id = str(uuid.uuid4())
    user_doc = {
        'id': user_id,
        'firebase_uid': uid,
        'email': email,
        'name': name,
        'fitness_goal': None,
        'age': None,
        'weight': None,
        'height': None,
        'experience_level': None,
        'created_at': now_iso(),
    }
    USERS_BY_ID[user_id] = user_doc
    USERS_BY_UID[uid] = user_id
    PROGRESS_BY_USER[user_id] = []
    CART_BY_USER[user_id] = []
    ORDERS_BY_USER[user_id] = []
    return user_doc


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Dict[str, Any]:
    if not credentials or not credentials.credentials:
        raise HTTPException(status_code=401, detail='Missing auth token')
    return get_or_create_user_from_token(credentials.credentials)


def build_workout_plan(goal: str, experience_level: str, days_per_week: int) -> str:
    level_map = {
        'beginner': {'sets': '3', 'rest': '90 sec'},
        'intermediate': {'sets': '4', 'rest': '75 sec'},
        'advanced': {'sets': '5', 'rest': '60 sec'},
    }
    cfg = level_map.get(experience_level.lower(), level_map['intermediate'])
    templates = [
        ('Upper Body', ['Push-ups', 'Dumbbell Press', 'One-arm Row', 'Shoulder Press', 'Plank']),
        ('Lower Body', ['Squat', 'Romanian Deadlift', 'Lunges', 'Calf Raises', 'Dead Bug']),
        ('Conditioning', ['Jump Rope', 'Mountain Climbers', 'Kettlebell Swings', 'Burpees', 'Farmer Carry']),
        ('Pull Day', ['Lat Pulldown', 'Seated Row', 'Face Pull', 'Biceps Curl', 'Side Plank']),
        ('Push + Legs', ['Incline Push-up', 'Goblet Squat', 'Step-ups', 'Leg Press', 'Hollow Hold']),
        ('Full Body', ['Squat to Press', 'Rows', 'Reverse Lunge', 'Push-up', 'Plank Reach']),
        ('Recovery', ['Dynamic Stretch', 'Hip Opener', 'Thoracic Rotation', 'Hamstring Flow', 'Breathing']),
    ]
    chosen = templates[:max(1, min(days_per_week, 7))]
    lines = [
        f'Goal: {goal.replace("_", " ").title()}',
        f'Experience Level: {experience_level.title()}',
        f'Schedule: {days_per_week} days/week',
        '',
        'Warm-up: 5-8 minutes cardio + dynamic mobility.',
        'Cool-down: 5 minutes stretching and breathing.',
        '',
    ]
    for i, (title, exs) in enumerate(chosen, start=1):
        lines.append(f'Day {i}: {title}')
        for ex in exs:
            if 'Plank' in ex or 'Carry' in ex or 'Breathing' in ex:
                lines.append(f'- {ex}: {cfg["sets"]} sets x 30-45 sec, Rest {cfg["rest"]}')
            else:
                lines.append(f'- {ex}: {cfg["sets"]} sets x 8-12 reps, Rest {cfg["rest"]}')
        lines.append('')
    return '\n'.join(lines)


def call_gemini(prompt: str, system_hint: str = '') -> str:
    """Send a prompt to the Gemini API and return the text response."""
    if not GEMINI_API_KEY:
        raise RuntimeError('GEMINI_API_KEY is not configured')

    url = f'https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent?key={GEMINI_API_KEY}'

    contents = []
    if system_hint:
        contents.append({'role': 'user', 'parts': [{'text': system_hint}]})
        contents.append({'role': 'model', 'parts': [{'text': 'Understood. I will follow those instructions.'}]})
    contents.append({'role': 'user', 'parts': [{'text': prompt}]})

    payload = {
        'contents': contents,
        'generationConfig': {
            'temperature': 0.7,
            'maxOutputTokens': 2048,
        },
    }

    response = requests.post(
        url,
        headers={'Content-Type': 'application/json'},
        json=payload,
        timeout=GEMINI_TIMEOUT_SECONDS,
    )

    if not response.ok:
        raise RuntimeError(f'Gemini API request failed: {response.status_code} {response.text[:200]}')

    data = response.json()
    try:
        return data['candidates'][0]['content']['parts'][0]['text'].strip()
    except (KeyError, IndexError) as exc:
        raise RuntimeError(f'Unexpected Gemini response structure: {exc}') from exc


def build_gemini_workout_plan(user: Dict[str, Any], goal: str, experience_level: str, days_per_week: int) -> Dict[str, str]:
    # Calculate BMI for prompt context
    bmi = None
    if user.get('weight') and user.get('height'):
        bmi = round(user['weight'] / ((user['height'] / 100) ** 2), 1)

    system_hint = (
        'You are an elite sports scientist and head coach at FitPro Market. '
        'You provide high-performance training protocols based on rigorous bio-metric analysis. '
        'Your response MUST be divided into two specific sections with these exact headers:\n'
        '1. "ANALYSIS:": A 2-3 sentence sophisticated technical assessment of the user s physical profile (mentioning BMI, metabolic considerations, and goal alignment).\n'
        '2. "PLAN:": The high-performance schedule starting with "Day 1".\n\n'
        'Use the format "Day X: [Title]" for daily headers. '
        'For each exercise, use a dash "-" as a bullet point. '
        'Include precise volume (sets x reps), rest periods, and a high-level technical form tip.'
    )
    user_context = (
        f'User Data:\n'
        f'- Age: {user.get("age") or "Unknown"} years\n'
        f'- Weight: {user.get("weight") or "Unknown"} kg\n'
        f'- Height: {user.get("height") or "Unknown"} cm\n'
        f'- BMI: {bmi or "Unknown"}\n'
        f'- Current Level: {experience_level.title()}\n'
        f'- Primary Goal: {goal.replace("_", " ").title()}\n'
    )
    user_prompt = (
        f'{user_context}\n'
        f'Task: Generate a {days_per_week}-day per week optimized workout plan based on the data above. '
        f'If the goal seems unsuitable for the user s age or BMI, provide a safer alternative in your analysis.'
    )
    full_text = call_gemini(user_prompt, system_hint)
    
    # Split text into Analysis and Plan
    analysis = "Profile analysis complete. Proceeding with your personalized plan."
    plan = full_text
    
    if 'ANALYSIS:' in full_text and 'PLAN:' in full_text:
        parts = full_text.split('PLAN:', 1)
        analysis = parts[0].replace('ANALYSIS:', '').strip()
        plan = parts[1].strip()
    
    return {'analysis': analysis, 'plan': plan}



@api_router.get('/ai/analyze-profile')
async def analyze_profile(user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    # Ensure metrics exist, otherwise return a message instead of 404/422
    if not (user.get('age') and user.get('weight') and user.get('height')):
        return {'analysis': 'Complete your bio-metrics in the profile section to receive a professional AI coach evaluation.'}
    
    bmi = round(user['weight'] / ((user['height'] / 100) ** 2), 1)
    system_hint = (
        'You are an expert sports scientist. Provide a 1-2 sentence professional assessment of the physical state. '
        'Mention the BMI and briefly state what to focus on (e.g., hypertrophy, fat loss, or mobility) based on metrics. '
        'Keep it encouraging and elite.'
    )
    prompt = (
        f'User Data: {user.get("age")}yr old, {user.get("weight")}kg, {user.get("height")}cm. '
        f'BMI is {bmi}. Fitness Goal: {user.get("fitness_goal")}. Level: {user.get("experience_level")}.'
    )
    
    try:
        analysis = call_gemini(prompt, system_hint)
        return {'analysis': analysis.strip() if analysis else f'Your BMI is {bmi}. Stay focused on your goals.'}
    except Exception:
        return {'analysis': f'Your BMI is {bmi}. Complete your profile details for a more detailed AI assessment.'}


@api_router.post('/ai/generate-workout')
async def generate_workout(request: WorkoutRequest, user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    # Resolve goal and level from profile if use_profile is set
    goal = request.goal or user.get('fitness_goal', 'general_fitness') or 'general_fitness'
    level = request.experience_level or user.get('experience_level', 'intermediate') or 'intermediate'
    days = request.days_per_week or (5 if level == 'advanced' else 4 if level == 'intermediate' else 3)
    
    try:
        result = build_gemini_workout_plan(user, goal, level, days)
        return {
            'plan_id': str(uuid.uuid4()),
            'plan': result.get('plan', ''),
            'analysis': result.get('analysis', ''),
            'config': {'goal': goal, 'level': level, 'days': days}
        }
    except Exception as exc:
        logger.warning('Gemini workout plan failed, using local fallback: %s', exc)
        plan_text = build_workout_plan(goal, level, days)
        return {
            'plan_id': str(uuid.uuid4()),
            'plan': plan_text,
            'analysis': "We've generated a standard plan while our AI is catching its breath.",
            'config': {'goal': goal, 'level': level, 'days': days}
        }


@api_router.get('/')
async def root() -> Dict[str, str]:
    return {'message': 'FitPro Market API (In-Memory)'}


@api_router.get('/profile', response_model=UserProfile)
async def get_profile(user: Dict[str, Any] = Depends(get_current_user)) -> UserProfile:
    return UserProfile(**user)


@api_router.put('/profile')
async def update_profile(profile_data: UpdateProfile, user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    update_data = {k: v for k, v in profile_data.model_dump().items() if v is not None}
    if update_data:
        USERS_BY_ID[user['id']].update(update_data)
    return {'message': 'Profile updated', 'user': UserProfile(**USERS_BY_ID[user['id']])}


@api_router.post('/ai/generate-diet')
async def generate_diet(request: DietRequest, user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, str]:
    try:
        system_hint = 'You are a certified sports nutritionist. Provide practical, specific diet plans with meal timing, macros, and food examples.'
        prompt = (
            f'Create a daily diet plan for someone with these details:\n'
            f'- Goal: {request.goal.replace("_", " ").title()}\n'
            f'- Weight: {request.weight}kg\n'
            f'- Height: {request.height}cm\n'
            f'- Dietary preferences: {request.dietary_preferences or "none"}\n\n'
            f'Include: total calories, macro split (protein/carbs/fat in grams), meal timing (breakfast/lunch/dinner/snacks), '
            f'and a sample meal for each. Keep it practical and specific.'
        )
        diet_plan = call_gemini(prompt, system_hint)
    except Exception as exc:
        logger.warning('Gemini diet plan failed, using fallback: %s', exc)
        calories = 2200 if request.goal == 'muscle_gain' else 1800
        diet_plan = f'Diet target: {calories} kcal/day, protein 1.8g/kg, hydration 2.5L/day. Preference: {request.dietary_preferences or "none"}'
    return {'diet_plan': diet_plan}


@api_router.post('/ai/chat')
async def chat_with_coach(chat_msg: ChatMessage, user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, str]:
    try:
        system_hint = (
            'You are FitBot, an expert AI fitness coach on the FitPro Market platform. '
            'You specialize in strength training, hypertrophy, fat loss, nutrition, supplements, and injury prevention. '
            'Give concise, practical, evidence-based advice. Be motivating but realistic. '
            'Format responses clearly with bullet points or numbered steps when listing items.'
        )
        reply = call_gemini(chat_msg.message, system_hint)
    except Exception as exc:
        logger.warning('Gemini chat failed: %s', exc)
        reply = f"Coach: For '{chat_msg.message}', prioritize consistency, sleep, and progressive overload."
    return {'response': reply, 'session_id': chat_msg.session_id or str(uuid.uuid4())}


@api_router.post('/ai/recommend-supplements')
async def recommend_supplements(request: SupplementRecommendationRequest, user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, str]:
    try:
        system_hint = 'You are a sports nutrition expert. Recommend specific supplements with dosages and timing based on fitness goals and experience level.'
        prompt = (
            f'Recommend the top 5 supplements for someone with:\n'
            f'- Goal: {request.goal.replace("_", " ").title()}\n'
            f'- Experience level: {request.experience_level.title()}\n\n'
            f'For each supplement include: name, recommended dose, best timing, and why it helps their goal. Be specific.'
        )
        recs = call_gemini(prompt, system_hint)
    except Exception as exc:
        logger.warning('Gemini supplement recs failed: %s', exc)
        recs = 'Whey Protein (25-30g post-workout), Creatine Monohydrate (5g daily), Pre-Workout (30min before training), Omega-3 (2-3g daily), Multivitamin (with breakfast).'
    return {'recommendations': recs}


@api_router.get('/progress', response_model=List[ProgressEntry])
async def get_progress(user: Dict[str, Any] = Depends(get_current_user)) -> List[ProgressEntry]:
    entries = sorted(PROGRESS_BY_USER.get(user['id'], []), key=lambda x: x['date'], reverse=True)
    return [ProgressEntry(**e) for e in entries]


@api_router.post('/progress', response_model=ProgressEntry)
async def create_progress(entry: ProgressCreate, user: Dict[str, Any] = Depends(get_current_user)) -> ProgressEntry:
    doc = entry.model_dump()
    doc['id'] = str(uuid.uuid4())
    doc['user_id'] = user['id']
    doc['created_at'] = now_iso()
    PROGRESS_BY_USER.setdefault(user['id'], []).append(doc)
    return ProgressEntry(**doc)


@api_router.get('/products', response_model=List[Product])
async def get_products(category: Optional[str] = None, goal: Optional[str] = None) -> List[Product]:
    filtered = PRODUCTS
    if category:
        filtered = [p for p in filtered if p['category'] == category]
    if goal:
        filtered = [p for p in filtered if goal in p.get('goals', [])]
    return [Product(**p) for p in filtered]


@api_router.get('/products/{product_id}', response_model=Product)
async def get_product(product_id: str) -> Product:
    product = PRODUCTS_BY_ID.get(product_id)
    if not product:
        raise HTTPException(status_code=404, detail='Product not found')
    return Product(**product)


@api_router.get('/reviews/{product_id}', response_model=List[Review])
async def get_reviews(product_id: str) -> List[Review]:
    reviews = sorted(REVIEWS_BY_PRODUCT.get(product_id, []), key=lambda r: r['created_at'], reverse=True)
    return [Review(**r) for r in reviews]


@api_router.post('/reviews/{product_id}', response_model=Review)
async def create_review(product_id: str, review_data: ReviewCreate, user: Dict[str, Any] = Depends(get_current_user)) -> Review:
    if product_id not in PRODUCTS_BY_ID:
        raise HTTPException(status_code=404, detail='Product not found')
    if any(r['user_id'] == user['id'] for r in REVIEWS_BY_PRODUCT.get(product_id, [])):
        raise HTTPException(status_code=400, detail='You have already reviewed this product')

    doc = {
        'id': str(uuid.uuid4()),
        'product_id': product_id,
        'user_id': user['id'],
        'user_name': user['name'],
        'rating': review_data.rating,
        'comment': review_data.comment,
        'created_at': now_iso(),
    }
    REVIEWS_BY_PRODUCT.setdefault(product_id, []).append(doc)
    all_reviews = REVIEWS_BY_PRODUCT[product_id]
    PRODUCTS_BY_ID[product_id]['rating'] = round(sum(r['rating'] for r in all_reviews) / len(all_reviews), 1)
    PRODUCTS_BY_ID[product_id]['reviews_count'] = len(all_reviews)
    return Review(**doc)


@api_router.get('/cart', response_model=List[CartItemResponse])
async def get_cart(user: Dict[str, Any] = Depends(get_current_user)) -> List[CartItemResponse]:
    result: List[CartItemResponse] = []
    for item in CART_BY_USER.get(user['id'], []):
        result.append(CartItemResponse(product_id=item['product_id'], quantity=item['quantity'], product=PRODUCTS_BY_ID.get(item['product_id'])))
    return result


@api_router.post('/cart')
async def add_to_cart(item: CartItem, user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, str]:
    product = PRODUCTS_BY_ID.get(item.product_id)
    if not product:
        raise HTTPException(status_code=404, detail='Product not found')
    user_cart = CART_BY_USER.setdefault(user['id'], [])
    existing = next((x for x in user_cart if x['product_id'] == item.product_id), None)
    if existing:
        existing['quantity'] += item.quantity
    else:
        user_cart.append({'product_id': item.product_id, 'quantity': item.quantity})
    return {'message': 'Item added to cart'}


@api_router.put('/cart/{product_id}')
async def update_cart(product_id: str, quantity: int, user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, str]:
    cart = CART_BY_USER.setdefault(user['id'], [])
    if quantity <= 0:
        CART_BY_USER[user['id']] = [x for x in cart if x['product_id'] != product_id]
        return {'message': 'Item removed from cart'}
    for x in cart:
        if x['product_id'] == product_id:
            x['quantity'] = quantity
            return {'message': 'Cart updated'}
    cart.append({'product_id': product_id, 'quantity': quantity})
    return {'message': 'Cart updated'}


@api_router.delete('/cart/{product_id}')
async def remove_from_cart(product_id: str, user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, str]:
    cart = CART_BY_USER.setdefault(user['id'], [])
    CART_BY_USER[user['id']] = [x for x in cart if x['product_id'] != product_id]
    return {'message': 'Item removed from cart'}


@api_router.post('/checkout/session')
async def create_checkout_session(checkout_req: CheckoutRequest, user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, str]:
    cart = CART_BY_USER.get(user['id'], [])
    if not cart:
        raise HTTPException(status_code=400, detail='Cart is empty')
    items: List[Dict[str, Any]] = []
    total = 0.0
    for c in cart:
        p = PRODUCTS_BY_ID.get(c['product_id'])
        if not p:
            continue
        items.append({'product_id': p['id'], 'name': p['name'], 'price': p['price'], 'quantity': c['quantity']})
        total += p['price'] * c['quantity']
    if total <= 0:
        raise HTTPException(status_code=400, detail='Invalid cart total')

    session_id = f'cs_{uuid.uuid4().hex[:18]}'
    PAYMENT_SESSIONS[session_id] = {
        'session_id': session_id,
        'user_id': user['id'],
        'status': 'open',
        'payment_status': 'unpaid',
        'amount_total': int(round(total * 100)),
        'currency': 'usd',
        'items': items,
    }
    return {'url': f"{checkout_req.origin_url}/checkout/success?session_id={session_id}", 'session_id': session_id}


@api_router.get('/checkout/status/{session_id}')
async def get_checkout_status(session_id: str, user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    s = PAYMENT_SESSIONS.get(session_id)
    if not s or s['user_id'] != user['id']:
        raise HTTPException(status_code=404, detail='Checkout session not found')

    if s['payment_status'] != 'paid':
        s['status'] = 'complete'
        s['payment_status'] = 'paid'
        order = {
            'id': str(uuid.uuid4()),
            'user_id': user['id'],
            'items': s['items'],
            'total': round(s['amount_total'] / 100, 2),
            'status': 'confirmed',
            'stripe_session_id': session_id,
            'created_at': now_iso(),
        }
        ORDERS_BY_USER.setdefault(user['id'], []).insert(0, order)
        CART_BY_USER[user['id']] = []

    return {'status': s['status'], 'payment_status': s['payment_status'], 'amount_total': s['amount_total'], 'currency': s['currency']}


@api_router.get('/orders', response_model=List[Order])
async def get_orders(user: Dict[str, Any] = Depends(get_current_user)) -> List[Order]:
    return [Order(**o) for o in ORDERS_BY_USER.get(user['id'], [])]


@api_router.get('/analytics/summary')
async def get_analytics_summary(user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    progress = PROGRESS_BY_USER.get(user['id'], [])
    return {
        'total_workouts': sum(1 for p in progress if p.get('workout_completed')),
        'total_orders': len(ORDERS_BY_USER.get(user['id'], [])),
        'total_chats': 0,
        'recent_progress': sorted(progress, key=lambda x: x['date'], reverse=True)[:30],
    }


app.include_router(api_router)


def get_cors_origins() -> List[str]:
    raw = os.environ.get('CORS_ORIGINS', '').strip()
    if raw:
        return [origin.strip() for origin in raw.split(',') if origin.strip()]
    return [
        'http://localhost:5173',
        'http://localhost:5174',
        'http://localhost:5175',
        'http://localhost:5176',
        'http://localhost:3000',
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_cors_origins(),
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)


if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, host=os.environ.get('HOST', '0.0.0.0'), port=int(os.environ.get('PORT', 8000)))
