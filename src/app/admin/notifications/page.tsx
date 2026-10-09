'use client';

import React, { useState } from 'react';
import {
  Bell,
  Mail,
  MessageSquare,
  Smartphone,
  Send,
  Plus,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ToggleLeft,
  ToggleRight,
  Eye,
  Edit,
  X,
  RefreshCw,
  Search
} from 'lucide-react';

interface NotificationTemplate {
  id: string;
  triggerEvent: string;
  channel: 'WHATSAPP' | 'SMS' | 'EMAIL';
  title: string;
  bodyPreview: string;
  variables: string[];
  isActive: boolean;
  sent24h: number;
}

interface DeliveryLog {
  id: string;
  recipient: string;
  channel: 'WHATSAPP' | 'SMS' | 'EMAIL';
  event: string;
  status: 'DELIVERED' | 'READ' | 'PENDING' | 'FAILED';
  timestamp: string;
}

const initialTemplates: NotificationTemplate[] = [
  {
    id: 'TPL-01',
    triggerEvent: 'Order Placed Successfully',
    channel: 'WHATSAPP',
    title: 'Merabetta Order Confirmation',
    bodyPreview: 'Dear {customer_name}, thank you for your order {order_id} of {item_count} items worth ₹{total_amount}. Your medical care essentials are being packed.',
    variables: ['customer_name', 'order_id', 'item_count', 'total_amount'],
    isActive: true,
    sent24h: 342,
  },
  {
    id: 'TPL-02',
    triggerEvent: 'Order Dispatched / Shipped',
    channel: 'SMS',
    title: 'Out for Delivery Alert',
    bodyPreview: 'Your Merabetta order {order_id} has been dispatched via {courier_name}. Track live at {tracking_url}. Expected arrival: {eta_date}.',
    variables: ['order_id', 'courier_name', 'tracking_url', 'eta_date'],
    isActive: true,
    sent24h: 289,
  },
  {
    id: 'TPL-03',
    triggerEvent: 'Order Delivered',
    channel: 'WHATSAPP',
    title: 'Delivery Confirmation & Feedback',
    bodyPreview: 'Hi {customer_name}, your order #{order_id} was safely delivered to {delivery_city}. Rate your delivery experience here: {review_link}.',
    variables: ['customer_name', 'order_id', 'delivery_city', 'review_link'],
    isActive: true,
    sent24h: 198,
  },
  {
    id: 'TPL-04',
    triggerEvent: 'Replacement / Return Approved',
    channel: 'EMAIL',
    title: 'Return Request Approved Notice',
    bodyPreview: 'Hello {customer_name}, your return request for {product_name} under claim #{claim_id} has been approved. Our pickup partner will collect the parcel.',
    variables: ['customer_name', 'product_name', 'claim_id'],
    isActive: true,
    sent24h: 31,
  },
  {
    id: 'TPL-05',
    triggerEvent: 'Customer Phone OTP Login',
    channel: 'SMS',
    title: 'Secure One-Time Passcode',
    bodyPreview: '{otp_code} is your confidential verification code for Merabetta Admin/Account login. Valid for 10 minutes. Do not share.',
    variables: ['otp_code'],
    isActive: true,
    sent24h: 580,
  },
  {
    id: 'TPL-06',
    triggerEvent: 'Abandoned Cart Reminder (2 hrs)',
    channel: 'WHATSAPP',
    title: 'Complete Your Senior Care Essentials',
    bodyPreview: 'Hi {customer_name}, you left items in your cart! Use code CARE10 for an extra 10% discount to complete your checkout: {cart_url}',
    variables: ['customer_name', 'cart_url'],
    isActive: false,
    sent24h: 0,
  },
];

const mockLogs: DeliveryLog[] = [
  { id: 'LOG-9102', recipient: '+91 98234 51234', channel: 'WHATSAPP', event: 'Order Confirmation', status: 'READ', timestamp: '2026-03-30 16:42' },
  { id: 'LOG-9101', recipient: '+91 94123 78901', channel: 'SMS', event: 'Dispatch Alert', status: 'DELIVERED', timestamp: '2026-03-30 16:38' },
  { id: 'LOG-9100', recipient: 'amitabh.s@example.com', channel: 'EMAIL', event: 'Return Approved', status: 'DELIVERED', timestamp: '2026-03-30 16:21' },
  { id: 'LOG-9099', recipient: '+91 98901 23456', channel: 'SMS', event: 'OTP Verification', status: 'DELIVERED', timestamp: '2026-03-30 16:15' },
  { id: 'LOG-9098', recipient: '+91 91234 56780', channel: 'WHATSAPP', event: 'Order Confirmation', status: 'FAILED', timestamp: '2026-03-30 15:58' },
  { id: 'LOG-9097', recipient: '+91 98765 43210', channel: 'WHATSAPP', event: 'Delivery Confirmation', status: 'READ', timestamp: '2026-03-30 15:30' },
  { id: 'LOG-9096', recipient: '+91 99401 22334', channel: 'SMS', event: 'Dispatch Alert', status: 'DELIVERED', timestamp: '2026-03-30 15:10' },
];

export default function NotificationsPage() {
  const [activeTab, setActiveTab] = useState<'TEMPLATES' | 'LOGS' | 'BROADCAST'>('TEMPLATES');
  const [templates, setTemplates] = useState<NotificationTemplate[]>(initialTemplates);
  const [logs] = useState<DeliveryLog[]>(mockLogs);
  const [channelFilter, setChannelFilter] = useState<'ALL' | 'WHATSAPP' | 'SMS' | 'EMAIL'>('ALL');
  const [editingTemplate, setEditingTemplate] = useState<NotificationTemplate | null>(null);
  const [notificationNotice, setNotificationNotice] = useState<string | null>(null);

  // Broadcast state
  const [broadcastChannel, setBroadcastChannel] = useState<'WHATSAPP' | 'SMS'>('WHATSAPP');
  const [broadcastTarget, setBroadcastTarget] = useState('ALL_CUSTOMERS');
  const [broadcastMessage, setBroadcastMessage] = useState('');

  const toggleTemplateActive = (id: string) => {
    setTemplates((prev) =>
      prev.map((t) => (t.id === id ? { ...t, isActive: !t.isActive } : t))
    );
    showNotice('Notification trigger status updated.');
  };

  const showNotice = (msg: string) => {
    setNotificationNotice(msg);
    setTimeout(() => setNotificationNotice(null), 3500);
  };

  const handleSaveTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTemplate) return;
    setTemplates((prev) =>
      prev.map((t) => (t.id === editingTemplate.id ? editingTemplate : t))
    );
    setEditingTemplate(null);
    showNotice('Template updated successfully.');
  };

  const filteredTemplates = templates.filter(
    (t) => channelFilter === 'ALL' || t.channel === channelFilter
  );

  return (
    <div className="space-y-6">
      {notificationNotice && (
        <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-[#E8F8EE] px-4 py-3 text-[13px] font-medium text-[#1E7F3D]">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} />
            <span>{notificationNotice}</span>
          </div>
          <button onClick={() => setNotificationNotice(null)} className="text-emerald-700 hover:text-emerald-900">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Main Container */}
      <div className="rounded-2xl border border-[#DDE3EA] bg-white p-6 shadow-[0_2px_5px_rgba(15,23,42,0.05)]">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#F0F2F5] pb-5">
          <div>
            <h2 className="text-[16px] font-semibold text-black">Notification Management</h2>
            <p className="mt-1 text-[12px] font-normal text-[#626262]">
              Configure automated WhatsApp messages, transactional SMS gateways, email notifications, and customer broadcasts.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                showNotice('Connecting to Gupshup & Twilio gateway test...');
              }}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#D6DCE5] bg-white px-3.5 text-[12px] font-medium text-gray-700 hover:bg-slate-50 cursor-pointer"
            >
              <RefreshCw size={14} />
              <span>Test Gateways</span>
            </button>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="mt-5 flex border-b border-gray-200">
          <button
            type="button"
            onClick={() => setActiveTab('TEMPLATES')}
            className={`flex items-center gap-2 border-b-2 px-5 py-3 text-[13px] font-semibold transition cursor-pointer ${
              activeTab === 'TEMPLATES'
                ? 'border-[#F47C35] text-[#F47C35]'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <Bell size={16} />
            <span>Automated Triggers ({templates.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('LOGS')}
            className={`flex items-center gap-2 border-b-2 px-5 py-3 text-[13px] font-semibold transition cursor-pointer ${
              activeTab === 'LOGS'
                ? 'border-[#F47C35] text-[#F47C35]'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <Clock size={16} />
            <span>Delivery Logs & Audits</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('BROADCAST')}
            className={`flex items-center gap-2 border-b-2 px-5 py-3 text-[13px] font-semibold transition cursor-pointer ${
              activeTab === 'BROADCAST'
                ? 'border-[#F47C35] text-[#F47C35]'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <Send size={16} />
            <span>Broadcast Campaign</span>
          </button>
        </div>

        {/* TAB 1: TEMPLATES */}
        {activeTab === 'TEMPLATES' && (
          <div className="mt-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {(['ALL', 'WHATSAPP', 'SMS', 'EMAIL'] as const).map((ch) => (
                  <button
                    key={ch}
                    type="button"
                    onClick={() => setChannelFilter(ch)}
                    className={`h-8 rounded-lg px-3 text-[12px] font-medium transition cursor-pointer ${
                      channelFilter === ch
                        ? 'bg-[#F47C35] text-white shadow-xs'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {ch === 'ALL' ? 'All Channels' : ch}
                  </button>
                ))}
              </div>

              <span className="text-[12px] text-gray-500">
                {templates.filter((t) => t.isActive).length} active automation triggers
              </span>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {filteredTemplates.map((template) => (
                <div
                  key={template.id}
                  className="flex flex-col justify-between rounded-xl border border-[#DDE3EA] bg-white p-5 shadow-xs transition hover:border-[#F47C35]/60"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-semibold ${
                            template.channel === 'WHATSAPP'
                              ? 'bg-emerald-50 text-emerald-600'
                              : template.channel === 'SMS'
                              ? 'bg-blue-50 text-blue-600'
                              : 'bg-purple-50 text-purple-600'
                          }`}
                        >
                          {template.channel === 'WHATSAPP' ? (
                            <MessageSquare size={14} />
                          ) : template.channel === 'SMS' ? (
                            <Smartphone size={14} />
                          ) : (
                            <Mail size={14} />
                          )}
                        </span>
                        <span className="text-[11px] font-bold text-gray-400">{template.id}</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => toggleTemplateActive(template.id)}
                        className="cursor-pointer"
                      >
                        {template.isActive ? (
                          <span className="flex items-center gap-1 text-[12px] font-medium text-emerald-600">
                            <ToggleRight size={22} className="text-emerald-500" /> Active
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-[12px] font-medium text-gray-400">
                            <ToggleLeft size={22} className="text-gray-400" /> Disabled
                          </span>
                        )}
                      </button>
                    </div>

                    <div className="mt-3">
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-gray-600">
                        Trigger: {template.triggerEvent}
                      </span>
                      <h4 className="mt-1.5 text-[14px] font-semibold text-gray-900">{template.title}</h4>
                      <p className="mt-2 rounded-lg bg-slate-50 p-3 text-[12px] text-gray-700 leading-relaxed font-mono">
                        "{template.bodyPreview}"
                      </p>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] text-gray-400">Variables:</span>
                      {template.variables.map((v) => (
                        <span
                          key={v}
                          className="rounded bg-orange-50 px-1.5 py-0.5 text-[10px] font-semibold text-[#F47C35]"
                        >
                          {`{${v}}`}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3 text-[12px] text-gray-500">
                    <span>Dispatched in last 24h: <strong className="text-gray-900">{template.sent24h}</strong></span>
                    <button
                      type="button"
                      onClick={() => setEditingTemplate(template)}
                      className="inline-flex items-center gap-1 rounded-md border border-[#D6DCE5] px-2.5 py-1 text-[12px] font-medium text-gray-700 hover:bg-slate-50"
                    >
                      <Edit size={13} />
                      <span>Edit Template</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: LOGS */}
        {activeTab === 'LOGS' && (
          <div className="mt-6 space-y-4">
            <div className="overflow-hidden rounded-lg border border-[#E5E5E5] shadow-xs">
              <table className="w-full min-w-[700px] border-collapse text-left">
                <thead className="bg-[#E4E4E4] text-[12px] font-medium text-[#292929]">
                  <tr className="h-[42px]">
                    <th className="border-r border-white px-4">Log ID</th>
                    <th className="border-r border-white px-4">Recipient</th>
                    <th className="border-r border-white px-4">Channel</th>
                    <th className="border-r border-white px-4">Event Trigger</th>
                    <th className="border-r border-white px-4">Delivery Status</th>
                    <th className="px-4">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E5E5] bg-white text-[13px] text-[#292929]">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-semibold text-black">{log.id}</td>
                      <td className="px-4 py-3 font-mono text-[12px]">{log.recipient}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded px-2 py-0.5 text-[11px] font-bold ${
                            log.channel === 'WHATSAPP'
                              ? 'bg-emerald-50 text-emerald-700'
                              : log.channel === 'SMS'
                              ? 'bg-blue-50 text-blue-700'
                              : 'bg-purple-50 text-purple-700'
                          }`}
                        >
                          {log.channel}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium">{log.event}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                            log.status === 'READ' || log.status === 'DELIVERED'
                              ? 'bg-emerald-50 text-emerald-700'
                              : log.status === 'PENDING'
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-rose-50 text-rose-700'
                          }`}
                        >
                          {log.status === 'READ' && <CheckCircle2 size={12} />}
                          {log.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[12px] text-gray-500">{log.timestamp}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: BROADCAST */}
        {activeTab === 'BROADCAST' && (
          <div className="mt-6 max-w-2xl space-y-4">
            <div className="rounded-xl border border-[#DDE3EA] p-5 space-y-4">
              <h3 className="text-[15px] font-semibold text-gray-900">Send Instant Broadcast Announcement</h3>
              <p className="text-[12px] text-gray-500">
                Dispatches promotional or service alerts to registered customers via Meta WhatsApp Business Cloud API or transactional SMS gateway.
              </p>

              <div>
                <label className="text-[12px] font-medium text-gray-700">Dispatch Channel</label>
                <div className="mt-1 flex gap-3">
                  <label className="flex items-center gap-2 text-[13px]">
                    <input
                      type="radio"
                      name="broadcastChannel"
                      checked={broadcastChannel === 'WHATSAPP'}
                      onChange={() => setBroadcastChannel('WHATSAPP')}
                    />
                    <span>WhatsApp Cloud API</span>
                  </label>
                  <label className="flex items-center gap-2 text-[13px]">
                    <input
                      type="radio"
                      name="broadcastChannel"
                      checked={broadcastChannel === 'SMS'}
                      onChange={() => setBroadcastChannel('SMS')}
                    />
                    <span>Priority SMS Gateway</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="text-[12px] font-medium text-gray-700">Target Audience Segment</label>
                <select
                  value={broadcastTarget}
                  onChange={(e) => setBroadcastTarget(e.target.value)}
                  className="mt-1 h-10 w-full rounded-lg border border-[#D6DCE5] px-3 text-[13px] outline-none focus:border-[#F47C35]"
                >
                  <option value="ALL_CUSTOMERS">All Registered Customers (4,289)</option>
                  <option value="INACTIVE_30">Inactive in last 30 days (842)</option>
                  <option value="REPEAT_BUYERS">Frequent Re-order Caregivers (1,120)</option>
                </select>
              </div>

              <div>
                <label className="text-[12px] font-medium text-gray-700">Message Content</label>
                <textarea
                  rows={4}
                  placeholder="Type your announcement or campaign copy..."
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#D6DCE5] p-3 text-[13px] outline-none focus:border-[#F47C35]"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => {
                    if (!broadcastMessage.trim()) {
                      alert('Please enter a message to broadcast.');
                      return;
                    }
                    showNotice(`Broadcast sent to segment "${broadcastTarget}" via ${broadcastChannel}.`);
                    setBroadcastMessage('');
                  }}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#F47C35] px-5 py-2.5 text-[13px] font-semibold text-white hover:bg-[#E96F29] cursor-pointer"
                >
                  <Send size={15} /> Send Broadcast
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Edit Template Modal */}
      {editingTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <form
            onSubmit={handleSaveTemplate}
            className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in"
          >
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div>
                <h3 className="text-[16px] font-bold text-gray-900">Edit Notification Template</h3>
                <span className="text-[12px] text-gray-500">{editingTemplate.id} • {editingTemplate.channel}</span>
              </div>
              <button
                type="button"
                onClick={() => setEditingTemplate(null)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-[13px]">
              <div>
                <label className="block font-medium text-gray-700">Template Title / Identifier</label>
                <input
                  type="text"
                  value={editingTemplate.title}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, title: e.target.value })}
                  className="mt-1 h-10 w-full rounded-lg border border-[#D6DCE5] px-3 text-[13px] outline-none focus:border-[#F47C35]"
                />
              </div>

              <div>
                <label className="block font-medium text-gray-700">Trigger Event</label>
                <input
                  type="text"
                  value={editingTemplate.triggerEvent}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, triggerEvent: e.target.value })}
                  className="mt-1 h-10 w-full rounded-lg border border-[#D6DCE5] px-3 text-[13px] outline-none focus:border-[#F47C35]"
                />
              </div>

              <div>
                <label className="block font-medium text-gray-700">Message Body Template</label>
                <textarea
                  rows={4}
                  value={editingTemplate.bodyPreview}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, bodyPreview: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-[#D6DCE5] p-3 text-[13px] font-mono outline-none focus:border-[#F47C35]"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2 border-t border-gray-100 pt-4">
              <button
                type="button"
                onClick={() => setEditingTemplate(null)}
                className="h-10 rounded-lg border border-[#D6DCE5] px-4 text-[13px] font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="h-10 rounded-lg bg-[#F47C35] px-5 text-[13px] font-semibold text-white hover:bg-[#E96F29]"
              >
                Save Template
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
