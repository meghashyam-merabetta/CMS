'use client';

import React, { useState } from 'react';
import {
  Image as ImageIcon,
  Plus,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  HelpCircle,
  FileText,
  ToggleLeft,
  ToggleRight,
  ExternalLink,
  Save,
  Search,
  AlertCircle,
  X
} from 'lucide-react';

interface Banner {
  id: string;
  title: string;
  subtitle: string;
  placement: 'HERO_SLIDER' | 'CATEGORY_TOP' | 'PROMO_STRIP' | 'POPUP';
  linkUrl: string;
  imageAlt: string;
  badge: string;
  isActive: boolean;
  clicks: number;
}

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: 'Orders' | 'Delivery' | 'Returns' | 'Medical Equipment';
  isActive: boolean;
}

const initialBanners: Banner[] = [
  {
    id: 'BAN-01',
    title: 'Trusted Senior Care Essentials - Up to 40% Off',
    subtitle: 'High-absorption adult diapers, skin wipes & protective underpads.',
    placement: 'HERO_SLIDER',
    linkUrl: '/products?category=diapers',
    imageAlt: 'Senior care products collection',
    badge: 'Trending',
    isActive: true,
    clicks: 1420,
  },
  {
    id: 'BAN-02',
    title: 'Mobility & Orthopedic Support Equipment',
    subtitle: 'Ergonomic wheelchairs, walking sticks, and lumbar braces delivered safely.',
    placement: 'HERO_SLIDER',
    linkUrl: '/products?category=mobility',
    imageAlt: 'Wheelchair and walking stick showcase',
    badge: 'New Arrival',
    isActive: true,
    clicks: 980,
  },
  {
    id: 'BAN-03',
    title: 'Free Health Checkup Kit with Orders Above ₹2,999',
    subtitle: 'Limited period offer for registered caregiver accounts.',
    placement: 'PROMO_STRIP',
    linkUrl: '/promotions/health-kit',
    imageAlt: 'Promo strip top header',
    badge: 'Special Promo',
    isActive: true,
    clicks: 2150,
  },
  {
    id: 'BAN-04',
    title: 'Respiratory Care: Oximeters & Nebulizers',
    subtitle: 'Hospital-grade precision monitoring at home.',
    placement: 'CATEGORY_TOP',
    linkUrl: '/products?category=respiratory',
    imageAlt: 'Nebulizers and oximeters',
    badge: 'Hot Deal',
    isActive: false,
    clicks: 430,
  },
];

const initialFAQs: FAQItem[] = [
  {
    id: 'FAQ-01',
    question: 'How do I choose the correct adult diaper size for my parent?',
    answer: 'Measure the waist or hip circumference at the widest point. Compare with our size chart: Medium (28-44 in), Large (40-55 in), and XL (48-68 in). If between sizes, choose the larger option for bedridden patients.',
    category: 'Medical Equipment',
    isActive: true,
  },
  {
    id: 'FAQ-02',
    question: 'What is the standard delivery timeline for medical equipment?',
    answer: 'Metro cities receive delivery within 24-48 hours. Tier-2 and Tier-3 cities typically take 3-5 business days. Express emergency dispatch is available in Mumbai, Delhi-NCR, Bengaluru, and Pune.',
    category: 'Delivery',
    isActive: true,
  },
  {
    id: 'FAQ-03',
    question: 'Can hygiene and sanitary products be returned after delivery?',
    answer: 'For hygiene and infection control standards, adult diapers, underpads, and intimate skin cleansers can only be returned if the outer factory seal is intact and reported within 48 hours of delivery.',
    category: 'Returns',
    isActive: true,
  },
  {
    id: 'FAQ-04',
    question: 'How do I claim manufacturer warranty for wheelchairs and monitors?',
    answer: 'Every Omron, Karma, or Vissco device includes an official manufacturer warranty card and invoice. You can submit a warranty claim directly from the Merabetta "Replacements" tab in your account.',
    category: 'Orders',
    isActive: true,
  },
];

export default function CMSPage() {
  const [activeTab, setActiveTab] = useState<'BANNERS' | 'FAQS' | 'POLICIES'>('BANNERS');
  const [banners, setBanners] = useState<Banner[]>(initialBanners);
  const [faqs, setFaqs] = useState<FAQItem[]>(initialFAQs);
  const [search, setSearch] = useState('');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Policy Form State
  const [returnPolicyDays, setReturnPolicyDays] = useState('7');
  const [supportEmail, setSupportEmail] = useState('care@merabetta.com');
  const [supportPhone, setSupportPhone] = useState('+91 1800 209 8899');
  const [termsText, setTermsText] = useState(
    'Merabetta Care Solutions provides verified geriatric care equipment, consumables, and mobility aids. All products are sourced directly from authorized manufacturers.'
  );

  // Add Banner Modal
  const [isAddBannerOpen, setIsAddBannerOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newSubtitle, setNewSubtitle] = useState('');
  const [newLink, setNewLink] = useState('');
  const [newPlacement, setNewPlacement] = useState<'HERO_SLIDER' | 'CATEGORY_TOP' | 'PROMO_STRIP'>('HERO_SLIDER');

  const toggleBannerStatus = (id: string) => {
    setBanners((prev) =>
      prev.map((b) => (b.id === id ? { ...b, isActive: !b.isActive } : b))
    );
    showNotice('Banner display status updated.');
  };

  const toggleFaqStatus = (id: string) => {
    setFaqs((prev) =>
      prev.map((f) => (f.id === id ? { ...f, isActive: !f.isActive } : f))
    );
    showNotice('FAQ publication status updated.');
  };

  const handleCreateBanner = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newBanner: Banner = {
      id: `BAN-0${banners.length + 1}`,
      title: newTitle,
      subtitle: newSubtitle,
      placement: newPlacement,
      linkUrl: newLink || '/products',
      imageAlt: newTitle,
      badge: 'Live',
      isActive: true,
      clicks: 0,
    };

    setBanners([newBanner, ...banners]);
    setIsAddBannerOpen(false);
    setNewTitle('');
    setNewSubtitle('');
    setNewLink('');
    showNotice('New banner published successfully.');
  };

  const showNotice = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3500);
  };

  return (
    <div className="space-y-6">
      {successMsg && (
        <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-[#E8F8EE] px-4 py-3 text-[13px] font-medium text-[#1E7F3D]">
          <div className="flex items-center gap-2">
            <CheckCircle size={16} />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-700 hover:text-emerald-900">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Main CMS Container */}
      <div className="rounded-2xl border border-[#DDE3EA] bg-white p-6 shadow-[0_2px_5px_rgba(15,23,42,0.05)]">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#F0F2F5] pb-5">
          <div>
            <h2 className="text-[16px] font-semibold text-black">Content Management System (CMS)</h2>
            <p className="mt-1 text-[12px] font-normal text-[#626262]">
              Manage consumer storefront hero sliders, promotional marketing strips, help center FAQs, and store policies.
            </p>
          </div>

          {activeTab === 'BANNERS' && (
            <button
              type="button"
              onClick={() => setIsAddBannerOpen(true)}
              className="inline-flex h-11 items-center gap-2 rounded-lg bg-[#F47C35] px-5 text-[13px] font-semibold text-white shadow-xs transition hover:bg-[#E96F29] cursor-pointer"
            >
              <Plus size={16} />
              <span>Add New Banner</span>
            </button>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="mt-5 flex border-b border-gray-200">
          <button
            type="button"
            onClick={() => setActiveTab('BANNERS')}
            className={`flex items-center gap-2 border-b-2 px-5 py-3 text-[13px] font-semibold transition cursor-pointer ${
              activeTab === 'BANNERS'
                ? 'border-[#F47C35] text-[#F47C35]'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <ImageIcon size={16} />
            <span>Hero & Promo Banners ({banners.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('FAQS')}
            className={`flex items-center gap-2 border-b-2 px-5 py-3 text-[13px] font-semibold transition cursor-pointer ${
              activeTab === 'FAQS'
                ? 'border-[#F47C35] text-[#F47C35]'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <HelpCircle size={16} />
            <span>FAQs & Customer Guide ({faqs.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('POLICIES')}
            className={`flex items-center gap-2 border-b-2 px-5 py-3 text-[13px] font-semibold transition cursor-pointer ${
              activeTab === 'POLICIES'
                ? 'border-[#F47C35] text-[#F47C35]'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <FileText size={16} />
            <span>Policies & Legal Terms</span>
          </button>
        </div>

        {/* TAB 1: BANNERS */}
        {activeTab === 'BANNERS' && (
          <div className="mt-6 space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {banners.map((banner) => (
                <div
                  key={banner.id}
                  className="flex flex-col justify-between rounded-xl border border-[#DDE3EA] bg-white p-5 shadow-xs transition hover:border-[#F47C35]/50"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="rounded bg-purple-50 px-2 py-0.5 text-[11px] font-semibold text-purple-700">
                        {banner.placement}
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleBannerStatus(banner.id)}
                        className="flex items-center gap-1.5 text-[12px] font-medium cursor-pointer"
                      >
                        {banner.isActive ? (
                          <span className="flex items-center gap-1 text-emerald-600">
                            <ToggleRight size={20} className="text-emerald-500" /> Active
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-gray-400">
                            <ToggleLeft size={20} className="text-gray-400" /> Inactive
                          </span>
                        )}
                      </button>
                    </div>

                    <h4 className="mt-3 text-[15px] font-semibold text-gray-900">{banner.title}</h4>
                    <p className="mt-1 text-[12px] text-[#626262] line-clamp-2">{banner.subtitle}</p>

                    <div className="mt-4 flex items-center gap-2 text-[12px] text-gray-500">
                      <ExternalLink size={13} />
                      <span className="font-mono text-[11px] text-[#F47C35]">{banner.linkUrl}</span>
                    </div>
                  </div>

                  <div className="mt-5 flex items-center justify-between border-t border-gray-100 pt-3 text-[12px] text-[#626262]">
                    <span>Total Clicks: <strong className="text-gray-900">{banner.clicks.toLocaleString()}</strong></span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => alert(`Previewing banner: ${banner.title}`)}
                        className="rounded-md border border-[#D6DCE5] px-2.5 py-1 font-medium text-gray-700 hover:bg-gray-50"
                      >
                        Preview
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setBanners(banners.filter((b) => b.id !== banner.id));
                          showNotice('Banner removed.');
                        }}
                        className="rounded-md p-1 text-rose-500 hover:bg-rose-50"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: FAQS */}
        {activeTab === 'FAQS' && (
          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-medium text-[#626262]">Customer Frequently Asked Questions</span>
              <button
                type="button"
                onClick={() => {
                  const q = prompt('Enter FAQ Question:');
                  if (!q) return;
                  const a = prompt('Enter Answer:');
                  if (!a) return;
                  setFaqs([
                    {
                      id: `FAQ-0${faqs.length + 1}`,
                      question: q,
                      answer: a,
                      category: 'Medical Equipment',
                      isActive: true,
                    },
                    ...faqs,
                  ]);
                  showNotice('FAQ added.');
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#D6DCE5] bg-white px-3.5 py-2 text-[12px] font-semibold text-gray-700 hover:bg-gray-50"
              >
                <Plus size={14} /> Add FAQ Item
              </button>
            </div>

            <div className="space-y-3">
              {faqs.map((faq) => (
                <div key={faq.id} className="rounded-xl border border-[#DDE3EA] bg-white p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                          {faq.category}
                        </span>
                        <h4 className="text-[14px] font-semibold text-gray-900">{faq.question}</h4>
                      </div>
                      <p className="mt-2 text-[13px] text-[#555] leading-relaxed">{faq.answer}</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleFaqStatus(faq.id)}
                      className="cursor-pointer shrink-0"
                    >
                      {faq.isActive ? (
                        <ToggleRight size={22} className="text-emerald-500" />
                      ) : (
                        <ToggleLeft size={22} className="text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: POLICIES */}
        {activeTab === 'POLICIES' && (
          <div className="mt-6 max-w-3xl space-y-6">
            <div className="rounded-xl border border-[#DDE3EA] p-5 space-y-4">
              <h3 className="text-[14px] font-semibold text-gray-900">Return & Replacement Window</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-[12px] font-medium text-gray-700">Return Window (Days)</label>
                  <input
                    type="number"
                    value={returnPolicyDays}
                    onChange={(e) => setReturnPolicyDays(e.target.value)}
                    className="mt-1 h-10 w-full rounded-lg border border-[#D6DCE5] px-3 text-[13px] outline-none focus:border-[#F47C35]"
                  />
                </div>
                <div>
                  <label className="text-[12px] font-medium text-gray-700">Customer Support Helpline</label>
                  <input
                    type="text"
                    value={supportPhone}
                    onChange={(e) => setSupportPhone(e.target.value)}
                    className="mt-1 h-10 w-full rounded-lg border border-[#D6DCE5] px-3 text-[13px] outline-none focus:border-[#F47C35]"
                  />
                </div>
              </div>

              <div>
                <label className="text-[12px] font-medium text-gray-700">Support Inquiry Email</label>
                <input
                  type="email"
                  value={supportEmail}
                  onChange={(e) => setSupportEmail(e.target.value)}
                  className="mt-1 h-10 w-full rounded-lg border border-[#D6DCE5] px-3 text-[13px] outline-none focus:border-[#F47C35]"
                />
              </div>

              <div>
                <label className="text-[12px] font-medium text-gray-700">Terms of Service Summary / Disclaimer</label>
                <textarea
                  rows={4}
                  value={termsText}
                  onChange={(e) => setTermsText(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#D6DCE5] p-3 text-[13px] outline-none focus:border-[#F47C35]"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => showNotice('Policies and store configuration saved successfully.')}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#F47C35] px-5 py-2.5 text-[13px] font-semibold text-white hover:bg-[#E96F29] cursor-pointer"
                >
                  <Save size={15} /> Save Policy Changes
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add Banner Modal */}
      {isAddBannerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <form
            onSubmit={handleCreateBanner}
            className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in"
          >
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <h3 className="text-[16px] font-bold text-gray-900">Add New Storefront Banner</h3>
              <button
                type="button"
                onClick={() => setIsAddBannerOpen(false)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-[13px]">
              <div>
                <label className="block font-medium text-gray-700">Banner Headline</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Premium Elder Care Essentials - Flat 25% Off"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="mt-1 h-10 w-full rounded-lg border border-[#D6DCE5] px-3 text-[13px] outline-none focus:border-[#F47C35]"
                />
              </div>

              <div>
                <label className="block font-medium text-gray-700">Sub-headline / Description</label>
                <input
                  type="text"
                  placeholder="e.g., High-absorption diapers, bed protectors & skin creams"
                  value={newSubtitle}
                  onChange={(e) => setNewSubtitle(e.target.value)}
                  className="mt-1 h-10 w-full rounded-lg border border-[#D6DCE5] px-3 text-[13px] outline-none focus:border-[#F47C35]"
                />
              </div>

              <div>
                <label className="block font-medium text-gray-700">Placement Slot</label>
                <select
                  value={newPlacement}
                  onChange={(e) => setNewPlacement(e.target.value as any)}
                  className="mt-1 h-10 w-full rounded-lg border border-[#D6DCE5] px-3 text-[13px] outline-none focus:border-[#F47C35]"
                >
                  <option value="HERO_SLIDER">Hero Slider (Homepage Carousel)</option>
                  <option value="PROMO_STRIP">Top Announcement Strip</option>
                  <option value="CATEGORY_TOP">Category Top Spotlight</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-gray-700">Target Redirect Link</label>
                <input
                  type="text"
                  placeholder="e.g., /products?category=diapers"
                  value={newLink}
                  onChange={(e) => setNewLink(e.target.value)}
                  className="mt-1 h-10 w-full rounded-lg border border-[#D6DCE5] px-3 text-[13px] outline-none focus:border-[#F47C35]"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2 border-t border-gray-100 pt-4">
              <button
                type="button"
                onClick={() => setIsAddBannerOpen(false)}
                className="h-10 rounded-lg border border-[#D6DCE5] px-4 text-[13px] font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="h-10 rounded-lg bg-[#F47C35] px-5 text-[13px] font-semibold text-white hover:bg-[#E96F29]"
              >
                Publish Banner
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
