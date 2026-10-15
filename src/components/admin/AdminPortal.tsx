import React, { useState, useMemo } from 'react';
import {
  ShoppingBag,
  Users,
  CheckCircle,
  TrendingUp,
  Boxes,
  Package,
  Search,
  Filter,
  LogOut,
  MessageCircle,
  ExternalLink,
  Plus,
  RefreshCw,
  Clock,
  Truck,
  Check,
  X,
  AlertTriangle,
  Eye,
  Edit2,
  Trash2,
  Sparkles,
  ShieldCheck,
  Receipt,
  DollarSign,
  Calculator,
  Printer,
  Copy,
  ArrowRight,
  LayoutDashboard,
  FileText,
} from 'lucide-react';
import {
  Order,
  Product,
  StockMutation,
  CustomerSummary,
  OrderStatus,
  PaymentStatus,
} from '../../types';
import {
  approvePayment,
  rejectPayment,
  updateOrderStatus,
  updateOrderCustomStatus,
  updateOrderTracking,
  updateProductDetails,
  addNewProduct,
  deleteProduct,
} from '../../lib/firestoreService';
import { printThermalReceipt, formatReceiptText } from '../../lib/receiptPrinter';
import { MochiLogo } from '../MochiLogo';
import { FlatshoeImage } from '../FlatshoeImage';
import { PosKasir } from './PosKasir';
import { PricingProfitManager } from './PricingProfitManager';
import { InventoryStockManager } from './InventoryStockManager';

interface AdminPortalProps {
  adminEmail: string;
  onLogout: () => void;
  products: Product[];
  orders: Order[];
  mutations: StockMutation[];
  isFirestoreConnected: boolean;
}

export type AdminTab =
  | 'dashboard'
  | 'products'
  | 'orders'
  | 'customers'
  | 'approval'
  | 'sales'
  | 'inventory'
  | 'pricing';

export const AdminPortal: React.FC<AdminPortalProps> = ({
  adminEmail,
  onLogout,
  products,
  orders,
  mutations,
  isFirestoreConnected,
}) => {
  // Navigation State - Default to Dashboard
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [isPosOpen, setIsPosOpen] = useState<boolean>(false);

  // Search and Filter States for Orders
  const [orderSearch, setOrderSearch] = useState('');
  const [orderPaymentStatusFilter, setOrderPaymentStatusFilter] = useState<string>('all');
  const [orderPaymentMethodFilter, setOrderPaymentMethodFilter] = useState<string>('all');
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('all');
  const [selectedOrderDetail, setSelectedOrderDetail] = useState<Order | null>(null);
  const [modalTrackingInput, setModalTrackingInput] = useState<string>('');
  const [isUpdatingTracking, setIsUpdatingTracking] = useState<boolean>(false);
  const [copiedReceiptModal, setCopiedReceiptModal] = useState<boolean>(false);

  // Search States for Customers
  const [customerSearch, setCustomerSearch] = useState('');

  // Search and Filter States for Approval
  const [approvalSearch, setApprovalSearch] = useState('');
  const [approvalStatusFilter, setApprovalStatusFilter] = useState<string>('Menunggu Verifikasi');

  // Product Edit Modal State
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isNewProductModalOpen, setIsNewProductModalOpen] = useState(false);
  const [newProdName, setNewProdName] = useState('');
  const [newProdCategory, setNewProdCategory] = useState<
    'Flat Shoes Klasik' | 'Pointed Elegant' | 'Loafers & Slip-on'
  >('Flat Shoes Klasik');
  const [newProdPrice, setNewProdPrice] = useState<number>(199000);
  const [newProdCostPrice, setNewProdCostPrice] = useState<number>(115000);
  const [newProdStock, setNewProdStock] = useState<number>(20);
  const [newProdColor, setNewProdColor] = useState('Blush Pink');
  const [newProdDesc, setNewProdDesc] = useState('Flatshoes berbusa mochi 8mm yang empuk anti capek.');
  const [newProdImage, setNewProdImage] = useState(
    'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&w=800&q=80'
  );

  const formatRupiah = (num: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(num);
  };

  // Compile unique Customers list
  const customersList: CustomerSummary[] = useMemo(() => {
    const map = new Map<string, CustomerSummary>();

    orders.forEach((ord) => {
      const cleanPhone = ord.customerPhone.trim();
      const existing = map.get(cleanPhone);
      if (existing) {
        existing.totalOrders += 1;
        existing.totalSpent += ord.totalAmount;
        existing.orders.push(ord);
        if (new Date(ord.createdAt) > new Date(existing.lastOrderDate)) {
          existing.lastOrderDate = ord.createdAt;
          existing.name = ord.customerName;
          existing.address = ord.customerAddress;
          existing.district = ord.district;
          existing.city = ord.city;
          existing.postalCode = ord.postalCode;
        }
      } else {
        map.set(cleanPhone, {
          phone: cleanPhone,
          name: ord.customerName,
          address: ord.customerAddress,
          district: ord.district,
          city: ord.city,
          postalCode: ord.postalCode,
          totalOrders: 1,
          totalSpent: ord.totalAmount,
          lastOrderDate: ord.createdAt,
          orders: [ord],
        });
      }
    });

    return Array.from(map.values()).sort((a, b) => b.totalSpent - a.totalSpent);
  }, [orders]);

  // Filtered Orders
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const matchesSearch =
        o.orderNumber.toLowerCase().includes(orderSearch.toLowerCase()) ||
        o.customerName.toLowerCase().includes(orderSearch.toLowerCase()) ||
        o.customerPhone.includes(orderSearch) ||
        (o.receiptNumber && o.receiptNumber.toLowerCase().includes(orderSearch.toLowerCase()));

      const matchesPaymentStatus =
        orderPaymentStatusFilter === 'all' || o.paymentStatus === orderPaymentStatusFilter;

      const matchesPaymentMethod =
        orderPaymentMethodFilter === 'all' || o.paymentMethod === orderPaymentMethodFilter;

      const matchesOrderStatus =
        orderStatusFilter === 'all' || o.orderStatus === orderStatusFilter;

      return (
        matchesSearch && matchesPaymentStatus && matchesPaymentMethod && matchesOrderStatus
      );
    });
  }, [orders, orderSearch, orderPaymentStatusFilter, orderPaymentMethodFilter, orderStatusFilter]);

  // Filtered Customers
  const filteredCustomers = useMemo(() => {
    return customersList.filter(
      (c) =>
        c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
        c.phone.includes(customerSearch) ||
        c.city.toLowerCase().includes(customerSearch.toLowerCase()) ||
        c.district.toLowerCase().includes(customerSearch.toLowerCase())
    );
  }, [customersList, customerSearch]);

  // Filtered Approval Orders
  const filteredApprovalOrders = useMemo(() => {
    return orders
      .filter((o) => {
        const matchesStatus =
          approvalStatusFilter === 'all' || o.orderStatus === approvalStatusFilter;
        const matchesSearch =
          o.orderNumber.toLowerCase().includes(approvalSearch.toLowerCase()) ||
          o.customerName.toLowerCase().includes(approvalSearch.toLowerCase()) ||
          o.customerPhone.includes(approvalSearch);
        return matchesStatus && matchesSearch;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [orders, approvalSearch, approvalStatusFilter]);

  // Sales and Profit Analytics
  const salesMetrics = useMemo(() => {
    const paidOrders = orders.filter((o) => o.paymentStatus === 'Lunas');
    const totalRevenue = paidOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const totalOrdersCount = orders.length;
    const aov = paidOrders.length > 0 ? Math.round(totalRevenue / paidOrders.length) : 0;

    let totalUnitsSold = 0;
    let totalGrossProfit = 0;
    const productSoldMap = new Map<string, { name: string; units: number; revenue: number }>();
    const categoryRevenueMap = new Map<string, number>();

    // Create cost lookup
    const costMap = new Map<string, number>();
    products.forEach((p) => {
      costMap.set(p.id, p.costPrice || Math.round(p.price * 0.55));
    });

    paidOrders.forEach((o) => {
      if (Array.isArray(o.items)) {
        o.items.forEach((item) => {
          totalUnitsSold += item.quantity;
          const cost = costMap.get(item.productId) || Math.round(item.price * 0.55);
          totalGrossProfit += (item.price - cost) * item.quantity;

          const existing = productSoldMap.get(item.productId);
          if (existing) {
            existing.units += item.quantity;
            existing.revenue += item.price * item.quantity;
          } else {
            productSoldMap.set(item.productId, {
              name: item.name,
              units: item.quantity,
              revenue: item.price * item.quantity,
            });
          }

          const prod = products.find((p) => p.id === item.productId);
          const cat = prod?.category || 'Flat Shoes Klasik';
          categoryRevenueMap.set(cat, (categoryRevenueMap.get(cat) || 0) + item.price * item.quantity);
        });
      }
    });

    const topSellingProducts = Array.from(productSoldMap.values())
      .sort((a, b) => b.units - a.units)
      .slice(0, 5);

    // Daily Sales (last 7 days aggregation)
    const dailyMap = new Map<string, number>();
    const days: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
      days.push(key);
      dailyMap.set(key, 0);
    }

    paidOrders.forEach((o) => {
      const d = new Date(o.createdAt);
      const key = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
      if (dailyMap.has(key)) {
        dailyMap.set(key, (dailyMap.get(key) || 0) + o.totalAmount);
      }
    });

    const dailySalesChart = days.map((day) => ({
      day,
      revenue: dailyMap.get(day) || 0,
    }));

    return {
      totalRevenue,
      totalOrdersCount,
      paidOrdersCount: paidOrders.length,
      aov,
      totalUnitsSold,
      totalGrossProfit,
      topSellingProducts,
      categoryRevenueMap,
      dailySalesChart,
    };
  }, [orders, products]);

  // Print Thermal Receipt for any order
  const handlePrintOrderReceipt = (order: Order, paperWidth: '58mm' | '80mm' = '58mm') => {
    printThermalReceipt({
      orderNumber: order.orderNumber,
      receiptNumber: order.receiptNumber,
      createdAt: order.createdAt,
      cashierName: order.cashierName || 'Kasir Mochi Steps',
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      items: order.items,
      subtotal: order.subtotal,
      discountAmount: order.discountAmount,
      totalAmount: order.totalAmount,
      paymentMethod: order.paymentMethod,
      cashReceived: order.cashReceived,
      cashChange: order.cashChange,
      notes: order.specialNotes,
      paperWidth,
    });
  };

  // Copy receipt text from order detail modal
  const handleCopyModalReceiptText = (order: Order) => {
    const text = formatReceiptText({
      orderNumber: order.orderNumber,
      receiptNumber: order.receiptNumber,
      createdAt: order.createdAt,
      cashierName: order.cashierName || 'Kasir Mochi Steps',
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      items: order.items,
      subtotal: order.subtotal,
      discountAmount: order.discountAmount,
      totalAmount: order.totalAmount,
      paymentMethod: order.paymentMethod,
      cashReceived: order.cashReceived,
      cashChange: order.cashChange,
      notes: order.specialNotes,
    });

    navigator.clipboard.writeText(text);
    setCopiedReceiptModal(true);
    setTimeout(() => setCopiedReceiptModal(false), 2000);
  };

  // Update Tracking Number from Modal
  const handleSaveModalTracking = async () => {
    if (!selectedOrderDetail) return;
    setIsUpdatingTracking(true);
    try {
      await updateOrderTracking(selectedOrderDetail.id, modalTrackingInput, 'Dikirim');
      setSelectedOrderDetail({
        ...selectedOrderDetail,
        trackingNumber: modalTrackingInput,
        orderStatus: 'Dikirim',
      });
      alert('Nomor resi berhasil diperbarui dan status diubah menjadi "Dikirim"!');
    } catch (e: any) {
      alert('Gagal memperbarui nomor resi.');
    } finally {
      setIsUpdatingTracking(false);
    }
  };

  // Handle Add New Product Submit
  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProdName.trim()) return;

    try {
      await addNewProduct({
        name: newProdName.trim(),
        category: newProdCategory,
        price: Number(newProdPrice),
        costPrice: Number(newProdCostPrice),
        stock: Number(newProdStock),
        minStock: 5,
        sizes: [36, 37, 38, 39, 40, 41],
        description: newProdDesc.trim(),
        imageUrl: newProdImage.trim(),
        color: newProdColor.trim(),
        badge: 'New Arrival',
        rating: 5.0,
        reviewCount: 1,
        material: 'Premium Microfiber Leather',
        heelHeight: '1 cm Flat',
      });
      setIsNewProductModalOpen(false);
      setNewProdName('');
      alert('Produk baru berhasil ditambahkan ke Firestore!');
    } catch (err) {
      console.error(err);
      alert('Gagal menambah produk.');
    }
  };

  // IF FULL POS MODE IS OPEN
  if (isPosOpen) {
    return (
      <div className="min-h-screen bg-[#faf6f7] p-4 sm:p-6 font-sans">
        <div className="max-w-7xl mx-auto">
          <PosKasir
            products={products}
            adminEmail={adminEmail}
            onBackToAdmin={() => setIsPosOpen(false)}
          />
        </div>
      </div>
    );
  }

  // Exact 8 Menu Navigation definition
  const adminMenuItems = [
    { id: 'dashboard', label: '1. Dashboard', icon: LayoutDashboard },
    { id: 'products', label: '2. Data Produk & Stok', icon: Package, count: products.length },
    { id: 'orders', label: '3. Data Order & Riwayat', icon: ShoppingBag, count: orders.length },
    { id: 'customers', label: '4. Data Pelanggan', icon: Users, count: customersList.length },
    {
      id: 'approval',
      label: '5. Approval Bukti Pembayaran',
      icon: CheckCircle,
      count: orders.filter((o) => o.orderStatus === 'Menunggu Verifikasi').length,
      badgeColor: 'bg-amber-500 text-white',
    },
    { id: 'sales', label: '6. Laporan Sales', icon: TrendingUp },
    { id: 'inventory', label: '7. Inventory & Stok', icon: Boxes, count: mutations.length },
    { id: 'pricing', label: '8. Pengaturan Harga & Profit', icon: DollarSign, tag: 'Formula' },
  ];

  return (
    <div className="min-h-screen bg-[#faf6f7] text-[#2d2226] flex flex-col font-sans">
      {/* Top Header */}
      <header className="bg-white border-b border-pink-200/80 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <MochiLogo variant="compact" size="md" />
              <div className="h-6 w-px bg-pink-200" />
              <div>
                <span className="font-heading font-bold text-sm tracking-wide text-gray-800 bg-pink-50 px-2.5 py-1 rounded-lg border border-pink-100 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#be185d]" />
                  <span>Portal Admin Mochi Steps</span>
                </span>
              </div>
            </div>

            {/* Top Bar Actions: POS Kasir button, Live Firestore, Webstore button & Logout */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* POS Kasir Dedicated Button */}
              <button
                type="button"
                onClick={() => setIsPosOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:brightness-105 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                title="Buka Halaman Kasir POS Toko Offline Mochi Steps"
              >
                <Receipt className="w-4 h-4" />
                <span>POS Kasir</span>
              </button>

              {/* Firestore Indicator */}
              <div
                className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                  isFirestoreConnected
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    isFirestoreConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                  }`}
                />
                <span className="hidden md:inline">Firestore:</span>
                <span>{isFirestoreConnected ? 'Terhubung' : 'Offline'}</span>
              </div>

              {/* Back to Webstore Button */}
              <button
                type="button"
                onClick={onLogout}
                className="px-3 py-2 rounded-xl bg-pink-100/80 hover:bg-pink-200/90 text-[#be185d] border border-pink-200 transition-all flex items-center gap-1.5 text-xs font-bold cursor-pointer"
                title="Buka Halaman Depan Webstore Toko"
              >
                <span>🌸 Webstore</span>
              </button>

              <div className="text-right hidden lg:block">
                <p className="text-xs font-bold text-gray-800 truncate max-w-[140px]">{adminEmail}</p>
                <p className="text-[10px] text-pink-600 font-medium">Administrator</p>
              </div>

              {/* Logout Button */}
              <button
                type="button"
                onClick={onLogout}
                className="p-2 sm:px-3 sm:py-2 rounded-xl bg-gray-100 hover:bg-red-50 text-gray-600 hover:text-red-600 transition-colors flex items-center gap-1.5 text-xs font-bold cursor-pointer"
                title="Keluar dari Portal Admin"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Keluar</span>
              </button>
            </div>
          </div>

          {/* Navigation Tabs - Exactly 8 Menus in requested order */}
          <nav className="flex space-x-1 sm:space-x-1.5 overflow-x-auto py-2 scrollbar-none border-t border-gray-100">
            {adminMenuItems.map((tab: any) => {
              const active = activeTab === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
                    active
                      ? 'bg-gradient-to-r from-[#d65b7d] to-[#be185d] text-white shadow-xs'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-white'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                  {tab.tag && (
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[9px] font-extrabold ${
                        active ? 'bg-white/20 text-white' : 'bg-pink-100 text-[#be185d]'
                      }`}
                    >
                      {tab.tag}
                    </span>
                  )}
                  {tab.count !== undefined && (
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                        active
                          ? 'bg-white/20 text-white'
                          : tab.badgeColor || 'bg-pink-100 text-[#be185d]'
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full">
        {/* ================= 1. DASHBOARD ================= */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Top Greeting & Fast Actions */}
            <div className="bg-gradient-to-r from-pink-50 via-white to-pink-50 p-5 rounded-3xl border border-pink-200/80 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-heading font-extrabold text-gray-900">
                  Ringkasan Toko Mochi Steps Solo 🌸
                </h2>
                <p className="text-xs text-gray-500">
                  Selamat datang di panel utama pengelolaan toko. Semua transaksi tersimpan aman di database Firestore.
                </p>
              </div>

              {/* Fast Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsPosOpen(true)}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <Receipt className="w-3.5 h-3.5" />
                  <span>Buka POS Kasir</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('pricing')}
                  className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <DollarSign className="w-3.5 h-3.5" />
                  <span>Atur Markup & Harga</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('inventory')}
                  className="px-3.5 py-2 rounded-xl bg-[#be185d] hover:bg-[#9d174d] text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <Boxes className="w-3.5 h-3.5" />
                  <span>Opname & Stok</span>
                </button>
              </div>
            </div>

            {/* 4 KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-3xl border border-pink-100 shadow-2xs space-y-1">
                <span className="text-[10px] uppercase font-bold text-gray-400">Total Omzet Lunas</span>
                <p className="text-2xl font-mono font-extrabold text-[#be185d]">
                  {formatRupiah(salesMetrics.totalRevenue)}
                </p>
                <p className="text-[11px] text-gray-500">
                  {salesMetrics.paidOrdersCount} transaksi terverifikasi
                </p>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-emerald-100 shadow-2xs space-y-1">
                <span className="text-[10px] uppercase font-bold text-emerald-600">Estimasi Laba Kotor</span>
                <p className="text-2xl font-mono font-extrabold text-emerald-700">
                  +{formatRupiah(salesMetrics.totalGrossProfit)}
                </p>
                <p className="text-[11px] text-emerald-600 font-semibold">
                  Berdasarkan HPP modal produk
                </p>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-blue-100 shadow-2xs space-y-1">
                <span className="text-[10px] uppercase font-bold text-blue-600">Total Unit Terjual</span>
                <p className="text-2xl font-mono font-extrabold text-blue-700">
                  {salesMetrics.totalUnitsSold} Pasang
                </p>
                <p className="text-[11px] text-gray-500">AOV: {formatRupiah(salesMetrics.aov)}</p>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-amber-100 shadow-2xs space-y-1">
                <span className="text-[10px] uppercase font-bold text-amber-600">Verifikasi Pembayaran</span>
                <p className="text-2xl font-mono font-extrabold text-amber-700">
                  {orders.filter((o) => o.orderStatus === 'Menunggu Verifikasi').length} Menunggu
                </p>
                <button
                  onClick={() => setActiveTab('approval')}
                  className="text-[11px] font-bold text-pink-700 hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <span>Proses Approval</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* 7-day Sales Chart & Top Selling */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Daily Sales Bar Preview */}
              <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-pink-100 shadow-2xs space-y-4">
                <h3 className="font-heading font-extrabold text-gray-900 text-sm">
                  Tren Penjualan 7 Hari Terakhir
                </h3>
                <div className="h-44 flex items-end justify-between gap-2 pt-6">
                  {salesMetrics.dailySalesChart.map((d, i) => {
                    const maxRev = Math.max(...salesMetrics.dailySalesChart.map((x) => x.revenue), 1000000);
                    const pct = Math.max(10, Math.round((d.revenue / maxRev) * 100));
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-2">
                        <span className="text-[9px] font-mono text-gray-500 font-bold">
                          {d.revenue > 0 ? (d.revenue / 1000).toFixed(0) + 'k' : '-'}
                        </span>
                        <div className="w-full max-w-[42px] bg-pink-100 rounded-t-xl overflow-hidden h-28 flex items-end">
                          <div
                            style={{ height: `${pct}%` }}
                            className="w-full bg-gradient-to-t from-[#be185d] to-[#d65b7d] rounded-t-xl transition-all"
                          />
                        </div>
                        <span className="text-[10px] text-gray-600 font-medium">{d.day}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Top 5 Best Sellers */}
              <div className="bg-white rounded-3xl p-6 border border-pink-100 shadow-2xs space-y-3">
                <h3 className="font-heading font-extrabold text-gray-900 text-sm">
                  Model Paling Diminati
                </h3>
                <div className="space-y-2.5">
                  {salesMetrics.topSellingProducts.length === 0 ? (
                    <p className="text-xs text-gray-400 py-6 text-center">Belum ada data penjualan lunas.</p>
                  ) : (
                    salesMetrics.topSellingProducts.map((p, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-xl bg-pink-50/50 border border-pink-100 flex items-center justify-between text-xs"
                      >
                        <div className="truncate pr-2">
                          <span className="font-bold text-gray-900">{p.name}</span>
                          <span className="text-[10px] text-gray-500 block">
                            Omzet: {formatRupiah(p.revenue)}
                          </span>
                        </div>
                        <span className="px-2 py-1 rounded-lg bg-pink-100 text-[#be185d] font-mono font-extrabold shrink-0">
                          {p.units} ps
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Recent Orders Table */}
            <div className="bg-white rounded-3xl p-6 border border-pink-100 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-heading font-extrabold text-gray-900 text-sm">
                  Pesanan & Transaksi Terbaru
                </h3>
                <button
                  onClick={() => setActiveTab('orders')}
                  className="text-xs font-bold text-pink-700 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>Lihat Semua Order</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-pink-50/60 text-gray-700 font-bold uppercase text-[10px] tracking-wider border-b border-pink-100">
                    <tr>
                      <th className="py-2.5 px-3">No. Transaksi</th>
                      <th className="py-2.5 px-3">Waktu</th>
                      <th className="py-2.5 px-3">Pelanggan</th>
                      <th className="py-2.5 px-3">Kanal</th>
                      <th className="py-2.5 px-3">Total</th>
                      <th className="py-2.5 px-3">Pembayaran</th>
                      <th className="py-2.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {orders.slice(0, 5).map((o) => (
                      <tr key={o.id} className="hover:bg-pink-50/30">
                        <td className="py-2.5 px-3 font-mono font-bold text-[#be185d]">{o.orderNumber}</td>
                        <td className="py-2.5 px-3 text-gray-500 font-mono text-[11px]">
                          {new Date(o.createdAt).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-gray-900">{o.customerName}</td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold ${
                              o.channel === 'pos'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-pink-100 text-[#be185d]'
                            }`}
                          >
                            {o.channel === 'pos' ? 'POS KASIR' : 'WEBSTORE'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold">{formatRupiah(o.totalAmount)}</td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              o.paymentStatus === 'Lunas'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {o.paymentStatus}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-gray-700">{o.orderStatus}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ================= 2. DATA PRODUK & STOK ================= */}
        {activeTab === 'products' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold font-heading text-gray-900">
                  Data Produk & Stok Sepatu
                </h2>
                <p className="text-xs text-gray-500">
                  Kelola katalog flatshoes, harga ritel, batas stok minimum, dan detail visual sepatu.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsNewProductModalOpen(true)}
                className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-[#d65b7d] to-[#be185d] text-white font-bold text-xs flex items-center gap-2 shadow-xs hover:brightness-105 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Tambah Sepatu Baru</span>
              </button>
            </div>

            {/* Products Table */}
            <div className="bg-white rounded-3xl border border-pink-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[#fff2f5] text-[#862744] font-bold border-b border-pink-100">
                    <tr>
                      <th className="px-4 py-3.5">Foto & Nama Sepatu</th>
                      <th className="px-4 py-3.5">Kategori</th>
                      <th className="px-4 py-3.5">HPP (Modal)</th>
                      <th className="px-4 py-3.5">Harga Jual</th>
                      <th className="px-4 py-3.5 text-center">Stok Fisik</th>
                      <th className="px-4 py-3.5 text-center">Status</th>
                      <th className="px-4 py-3.5 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-pink-50">
                    {products.map((p) => {
                      const min = p.minStock !== undefined ? p.minStock : 5;
                      const isLow = p.stock <= min;
                      const cost = p.costPrice || Math.round(p.price * 0.55);

                      return (
                        <tr key={p.id} className="hover:bg-pink-50/40 transition-colors">
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 bg-pink-100 border border-pink-200">
                                <FlatshoeImage
                                  src={p.imageUrl}
                                  alt={p.name}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <div>
                                <p className="font-bold text-gray-900 text-xs">{p.name}</p>
                                <p className="text-[10px] text-gray-500">{p.color}</p>
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-3.5 text-gray-600">{p.category}</td>
                          <td className="px-4 py-3.5 font-mono text-gray-600">{formatRupiah(cost)}</td>
                          <td className="px-4 py-3.5 font-mono font-bold text-[#be185d]">
                            {formatRupiah(p.price)}
                          </td>
                          <td className="px-4 py-3.5 text-center font-mono font-bold text-gray-800">
                            {p.stock} pasang
                          </td>

                          <td className="px-4 py-3.5 text-center">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                                p.stock === 0
                                  ? 'bg-red-500 text-white'
                                  : isLow
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {p.stock === 0 ? 'Habis' : isLow ? 'Stok Menipis' : 'Stok Aman'}
                            </span>
                          </td>

                          <td className="px-4 py-3.5 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => setEditingProduct(p)}
                                className="px-2.5 py-1.5 rounded-xl bg-gray-100 hover:bg-pink-50 text-gray-700 hover:text-[#be185d] font-bold text-[11px] transition-colors cursor-pointer"
                              >
                                <Edit2 className="w-3.5 h-3.5 inline mr-1" />
                                <span>Edit</span>
                              </button>
                              <button
                                type="button"
                                onClick={async () => {
                                  if (confirm(`Hapus produk "${p.name}" dari katalog?`)) {
                                    await deleteProduct(p.id);
                                  }
                                }}
                                className="p-1.5 rounded-xl bg-gray-100 hover:bg-red-50 text-gray-500 hover:text-red-600 transition-colors cursor-pointer"
                                title="Hapus Produk"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ================= 3. DATA ORDER & RIWAYAT ================= */}
        {activeTab === 'orders' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold font-heading text-gray-900">
                  Data Order & Riwayat Transaksi
                </h2>
                <p className="text-xs text-gray-500">
                  Semua transaksi Webstore & POS Kasir Solo. Dilengkapi tombol cetak ulang struk thermal.
                </p>
              </div>

              {/* Order Search */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Cari no. order, struk, pelanggan..."
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                  className="w-full sm:w-72 pl-9 pr-3 py-2 text-xs rounded-xl border border-pink-200 bg-white focus:outline-hidden focus:ring-2 focus:ring-pink-300"
                />
                <Search className="w-4 h-4 text-pink-400 absolute left-3 top-2.5" />
              </div>
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="font-bold text-gray-600 mr-1">Status Bayar:</span>
              {['all', 'Lunas', 'Menunggu Pembayaran', 'Ditolak'].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setOrderPaymentStatusFilter(st)}
                  className={`px-3 py-1 rounded-xl font-bold transition-all cursor-pointer ${
                    orderPaymentStatusFilter === st
                      ? 'bg-[#be185d] text-white shadow-2xs'
                      : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {st === 'all' ? 'Semua' : st}
                </button>
              ))}
            </div>

            {/* Orders Table */}
            <div className="bg-white rounded-3xl border border-pink-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[#fff2f5] text-[#862744] font-bold border-b border-pink-100">
                    <tr>
                      <th className="px-4 py-3.5">No. Transaksi</th>
                      <th className="px-4 py-3.5">Waktu</th>
                      <th className="px-4 py-3.5">Pelanggan</th>
                      <th className="px-4 py-3.5">Kanal</th>
                      <th className="px-4 py-3.5">Total Bayar</th>
                      <th className="px-4 py-3.5">Pembayaran</th>
                      <th className="px-4 py-3.5">Status Pesanan</th>
                      <th className="px-4 py-3.5 text-center">Aksi & Struk</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-pink-50">
                    {filteredOrders.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-12 text-center text-gray-400">
                          Tidak ada pesanan yang sesuai filter.
                        </td>
                      </tr>
                    ) : (
                      filteredOrders.map((ord) => (
                        <tr key={ord.id} className="hover:bg-pink-50/40 transition-colors">
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <span className="font-mono font-bold text-xs text-[#be185d] block">
                              {ord.orderNumber}
                            </span>
                            {ord.receiptNumber && (
                              <span className="text-[10px] text-gray-400 font-mono">
                                Struk: {ord.receiptNumber}
                              </span>
                            )}
                          </td>

                          <td className="px-4 py-3.5 text-gray-500 whitespace-nowrap font-mono text-[11px]">
                            {new Date(ord.createdAt).toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </td>

                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <p className="font-bold text-gray-900">{ord.customerName}</p>
                            <p className="text-[11px] text-gray-500">{ord.customerPhone}</p>
                          </td>

                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[9px] font-extrabold ${
                                ord.channel === 'pos'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-pink-100 text-[#be185d]'
                              }`}
                            >
                              {ord.channel === 'pos' ? 'POS KASIR' : 'WEBSTORE'}
                            </span>
                          </td>

                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <p className="font-heading font-extrabold text-[#be185d]">
                              {formatRupiah(ord.totalAmount)}
                            </p>
                            <span className="text-[10px] text-gray-500">{ord.paymentMethod}</span>
                          </td>

                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                ord.paymentStatus === 'Lunas'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-amber-50 text-amber-700 border border-amber-200'
                              }`}
                            >
                              {ord.paymentStatus}
                            </span>
                          </td>

                          <td className="px-4 py-3.5 whitespace-nowrap font-semibold text-gray-800">
                            {ord.orderStatus}
                          </td>

                          <td className="px-4 py-3.5 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1.5">
                              {/* Quick Print Thermal Receipt */}
                              <button
                                type="button"
                                onClick={() => handlePrintOrderReceipt(ord)}
                                className="px-2.5 py-1.5 rounded-xl bg-pink-100 hover:bg-[#be185d] text-[#be185d] hover:text-white font-bold text-[11px] transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
                                title="Cetak Ulang Struk Thermal"
                              >
                                <Printer className="w-3.5 h-3.5" />
                                <span>Struk</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedOrderDetail(ord);
                                  setModalTrackingInput(ord.trackingNumber || '');
                                }}
                                className="px-2.5 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-[11px] transition-colors flex items-center gap-1 cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Detail</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ================= 4. DATA PELANGGAN ================= */}
        {activeTab === 'customers' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold font-heading text-gray-900">
                  Data Pelanggan Mochi Steps
                </h2>
                <p className="text-xs text-gray-500">
                  Daftar pembeli setia dengan tombol direct chat WhatsApp otomatis.
                </p>
              </div>

              <div className="relative">
                <input
                  type="text"
                  placeholder="Cari nama, no. WA, kota..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  className="w-full sm:w-72 pl-9 pr-3 py-2 text-xs rounded-xl border border-pink-200 bg-white focus:outline-hidden"
                />
                <Search className="w-4 h-4 text-pink-400 absolute left-3 top-2.5" />
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-pink-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[#fff2f5] text-[#862744] font-bold border-b border-pink-100">
                    <tr>
                      <th className="px-4 py-3.5">Nama Lengkap</th>
                      <th className="px-4 py-3.5">Nomor WhatsApp</th>
                      <th className="px-4 py-3.5">Alamat Lengkap</th>
                      <th className="px-4 py-3.5">Kecamatan & Kota</th>
                      <th className="px-4 py-3.5 text-center">Jumlah Order</th>
                      <th className="px-4 py-3.5">Total Belanja</th>
                      <th className="px-4 py-3.5 text-center">Aksi Langsung</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-pink-50">
                    {filteredCustomers.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                          Belum ada data pelanggan yang cocok.
                        </td>
                      </tr>
                    ) : (
                      filteredCustomers.map((cust) => {
                        let waNum = cust.phone.replace(/[^0-9]/g, '');
                        if (waNum.startsWith('0')) waNum = '62' + waNum.slice(1);
                        else if (!waNum.startsWith('62')) waNum = '62' + waNum;
                        const greeting = encodeURIComponent(
                          `Halo Kak ${cust.name}, terima kasih telah berbelanja flatshoes di Mochi Steps! Ada yang bisa kami bantu?`
                        );
                        const waUrl = `https://wa.me/${waNum}?text=${greeting}`;

                        return (
                          <tr key={cust.phone} className="hover:bg-pink-50/40 transition-colors">
                            <td className="px-4 py-3.5 font-bold text-gray-900">{cust.name}</td>
                            <td className="px-4 py-3.5 font-mono text-gray-700">{cust.phone}</td>
                            <td className="px-4 py-3.5 text-gray-600 max-w-xs truncate">{cust.address}</td>
                            <td className="px-4 py-3.5 text-gray-600">
                              {cust.district}, {cust.city}
                            </td>
                            <td className="px-4 py-3.5 text-center font-bold text-gray-800">
                              {cust.totalOrders} order
                            </td>
                            <td className="px-4 py-3.5 font-mono font-bold text-[#be185d]">
                              {formatRupiah(cust.totalSpent)}
                            </td>
                            <td className="px-4 py-3.5 text-center whitespace-nowrap">
                              <a
                                href={waUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] inline-flex items-center gap-1 shadow-2xs"
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                                <span>Hubungi WA</span>
                              </a>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ================= 5. APPROVAL BUKTI PEMBAYARAN ================= */}
        {activeTab === 'approval' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold font-heading text-gray-900">
                  Approval Bukti Pembayaran
                </h2>
                <p className="text-xs text-gray-500">
                  Verifikasi transfer bank dan pembayaran QRIS pelanggan sebelum pesanan diproses.
                </p>
              </div>

              <div className="relative">
                <input
                  type="text"
                  placeholder="Cari order..."
                  value={approvalSearch}
                  onChange={(e) => setApprovalSearch(e.target.value)}
                  className="w-full sm:w-72 pl-9 pr-3 py-2 text-xs rounded-xl border border-pink-200 bg-white"
                />
                <Search className="w-4 h-4 text-pink-400 absolute left-3 top-2.5" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredApprovalOrders.length === 0 ? (
                <div className="col-span-full py-12 text-center text-gray-400 bg-white rounded-3xl border border-pink-100">
                  Tidak ada pembayaran yang menunggu verifikasi saat ini.
                </div>
              ) : (
                filteredApprovalOrders.map((ord) => (
                  <div
                    key={ord.id}
                    className="bg-white rounded-3xl p-5 border border-pink-100 shadow-2xs space-y-3 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex justify-between items-start border-b border-gray-100 pb-2 mb-2">
                        <div>
                          <span className="font-mono font-bold text-xs text-[#be185d]">
                            {ord.orderNumber}
                          </span>
                          <p className="text-[10px] text-gray-400">
                            {new Date(ord.createdAt).toLocaleString('id-ID')}
                          </p>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                          {ord.paymentStatus}
                        </span>
                      </div>

                      <div className="text-xs space-y-1">
                        <p className="font-bold text-gray-900">{ord.customerName}</p>
                        <p className="text-gray-500">{ord.customerPhone}</p>
                        <p className="font-mono font-bold text-sm text-[#be185d]">
                          {formatRupiah(ord.totalAmount)}
                        </p>
                        <p className="text-[11px] text-gray-600 bg-gray-50 p-1.5 rounded-lg">
                          Metode: {ord.paymentMethod}
                        </p>
                      </div>

                      {/* Items */}
                      <div className="mt-2 pt-2 border-t border-gray-100 text-[11px] space-y-1 text-gray-600">
                        {ord.items.map((it, idx) => (
                          <div key={idx} className="flex justify-between">
                            <span>{it.name} (EU {it.size}) x{it.quantity}</span>
                            <span>{formatRupiah(it.price * it.quantity)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-gray-100 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={async () => {
                          await approvePayment(ord, adminEmail);
                        }}
                        className="py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors cursor-pointer shadow-2xs flex items-center justify-center gap-1"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Setujui</span>
                      </button>

                      <button
                        type="button"
                        onClick={async () => {
                          const reason = prompt('Masukkan alasan penolakan pembayaran:') || 'Bukti transfer tidak valid';
                          await rejectPayment(ord, reason);
                        }}
                        className="py-2 rounded-xl bg-gray-100 hover:bg-red-50 text-gray-600 hover:text-red-600 font-bold text-xs transition-colors cursor-pointer flex items-center justify-center gap-1"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Tolak</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ================= 6. LAPORAN SALES ================= */}
        {activeTab === 'sales' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold font-heading text-gray-900">
                Laporan Sales & Profitabilitas
              </h2>
              <p className="text-xs text-gray-500">
                Analisis omzet riil dan kalkulasi keuntungan kotor berdasarkan data HPP modal sepatu.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-3xl border border-pink-100 shadow-2xs">
                <span className="text-[10px] uppercase font-bold text-gray-400">Total Omzet Penjualan</span>
                <p className="text-2xl font-mono font-extrabold text-[#be185d]">
                  {formatRupiah(salesMetrics.totalRevenue)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Dari {salesMetrics.paidOrdersCount} pesanan lunas
                </p>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-emerald-100 shadow-2xs">
                <span className="text-[10px] uppercase font-bold text-emerald-600">Total Laba Kotor (Gross Profit)</span>
                <p className="text-2xl font-mono font-extrabold text-emerald-700">
                  +{formatRupiah(salesMetrics.totalGrossProfit)}
                </p>
                <p className="text-xs text-emerald-600 mt-1">
                  Margin: {salesMetrics.totalRevenue > 0 ? ((salesMetrics.totalGrossProfit / salesMetrics.totalRevenue) * 100).toFixed(1) : 0}%
                </p>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-purple-100 shadow-2xs">
                <span className="text-[10px] uppercase font-bold text-purple-600">Total Sepatu Terjual</span>
                <p className="text-2xl font-mono font-extrabold text-purple-700">
                  {salesMetrics.totalUnitsSold} Pasang
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Rata-rata transaksi: {formatRupiah(salesMetrics.aov)}
                </p>
              </div>
            </div>

            {/* Category Revenue Breakdown */}
            <div className="bg-white rounded-3xl p-6 border border-pink-100 shadow-2xs space-y-3">
              <h3 className="font-heading font-extrabold text-gray-900 text-sm">
                Distribusi Pendapatan per Kategori
              </h3>
              <div className="space-y-3">
                {Array.from(salesMetrics.categoryRevenueMap.entries()).map(([cat, rev]) => {
                  const pct = salesMetrics.totalRevenue > 0 ? Math.round((rev / salesMetrics.totalRevenue) * 100) : 0;
                  return (
                    <div key={cat} className="space-y-1 text-xs">
                      <div className="flex justify-between font-bold">
                        <span>{cat}</span>
                        <span>{formatRupiah(rev)} ({pct}%)</span>
                      </div>
                      <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                        <div
                          style={{ width: `${pct}%` }}
                          className="bg-gradient-to-r from-pink-500 to-[#be185d] h-full rounded-full"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ================= 7. INVENTORY & STOK (UNIFIED MODULE) ================= */}
        {activeTab === 'inventory' && (
          <InventoryStockManager
            products={products}
            mutations={mutations}
            adminEmail={adminEmail}
          />
        )}

        {/* ================= 8. PENGATURAN HARGA & PROFIT ================= */}
        {activeTab === 'pricing' && <PricingProfitManager products={products} />}
      </main>

      {/* ================= MODAL: DETAIL PESANAN & CETAK STRUK ================= */}
      {selectedOrderDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-pink-100 p-6 sm:p-8 space-y-4 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setSelectedOrderDetail(null)}
              className="absolute top-5 right-5 p-2 rounded-full text-gray-400 hover:text-gray-700 hover:bg-pink-50 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <span className="font-mono font-bold text-sm text-[#be185d]">
                  {selectedOrderDetail.orderNumber}
                </span>
                <p className="text-xs text-gray-500">
                  {new Date(selectedOrderDetail.createdAt).toLocaleString('id-ID')}
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-pink-100 text-[#be185d]">
                {selectedOrderDetail.channel === 'pos' ? 'POS KASIR' : 'WEBSTORE'}
              </span>
            </div>

            {/* Customer Details */}
            <div className="bg-pink-50/50 p-3.5 rounded-2xl text-xs space-y-1">
              <p className="font-bold text-gray-900">{selectedOrderDetail.customerName}</p>
              <p className="text-gray-600 font-mono">{selectedOrderDetail.customerPhone}</p>
              <p className="text-gray-600">{selectedOrderDetail.customerAddress}</p>
              <p className="text-gray-500">
                {selectedOrderDetail.district}, {selectedOrderDetail.city} ({selectedOrderDetail.postalCode})
              </p>
            </div>

            {/* Items */}
            <div className="space-y-2 border-b border-gray-100 pb-3 text-xs">
              <span className="font-bold text-gray-700 block">Daftar Sepatu:</span>
              {selectedOrderDetail.items.map((it, idx) => (
                <div key={idx} className="flex justify-between items-center bg-gray-50 p-2 rounded-xl">
                  <div>
                    <span className="font-bold text-gray-900">{it.name}</span>
                    <span className="text-[10px] text-gray-500 block">
                      Ukuran EU {it.size} • {it.color}
                    </span>
                  </div>
                  <div className="text-right font-mono">
                    <span className="font-bold">{formatRupiah(it.price * it.quantity)}</span>
                    <span className="text-[10px] text-gray-400 block">{it.quantity} pasang</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Financial Summary */}
            <div className="text-xs space-y-1 border-b border-gray-100 pb-3 font-mono">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>{formatRupiah(selectedOrderDetail.subtotal)}</span>
              </div>
              {selectedOrderDetail.discountAmount ? (
                <div className="flex justify-between text-emerald-600">
                  <span>Diskon:</span>
                  <span>-{formatRupiah(selectedOrderDetail.discountAmount)}</span>
                </div>
              ) : null}
              <div className="flex justify-between">
                <span>Ongkir:</span>
                <span>{formatRupiah(selectedOrderDetail.shippingCost)}</span>
              </div>
              <div className="flex justify-between font-bold text-sm text-[#be185d] pt-1 border-t border-gray-100">
                <span>TOTAL:</span>
                <span>{formatRupiah(selectedOrderDetail.totalAmount)}</span>
              </div>
            </div>

            {/* Tracking Resi Input & Courier */}
            <div className="bg-gray-50 p-3.5 rounded-2xl text-xs space-y-2">
              <span className="font-bold text-gray-800 block">Kurir & Nomor Resi Pengiriman:</span>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Contoh: JNT-88291024 / Resi Kurir..."
                  value={modalTrackingInput}
                  onChange={(e) => setModalTrackingInput(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl border border-gray-200 bg-white font-mono text-xs focus:outline-hidden"
                />
                <button
                  type="button"
                  disabled={isUpdatingTracking}
                  onClick={handleSaveModalTracking}
                  className="px-3 py-2 rounded-xl bg-pink-100 hover:bg-[#be185d] text-[#be185d] hover:text-white font-bold text-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isUpdatingTracking ? 'Menyimpan...' : 'Update Resi'}
                </button>
              </div>
            </div>

            {/* Action Buttons: Thermal Print, Copy, Status Changer */}
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => handlePrintOrderReceipt(selectedOrderDetail, '58mm')}
                className="py-2.5 px-3 rounded-xl bg-[#be185d] hover:bg-[#9d174d] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak Struk Thermal</span>
              </button>

              <button
                type="button"
                onClick={() => handleCopyModalReceiptText(selectedOrderDetail)}
                className="py-2.5 px-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                {copiedReceiptModal ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                <span>{copiedReceiptModal ? 'Tersalin!' : 'Salin Teks Struk'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: EDIT PRODUCT DETAILS ================= */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-pink-100 p-6 sm:p-8 space-y-4 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setEditingProduct(null)}
              className="absolute top-5 right-5 p-2 rounded-full text-gray-400 hover:text-gray-700 hover:bg-pink-50 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-heading font-bold text-lg text-gray-900">
              Edit Produk: {editingProduct.name}
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Nama Sepatu:</label>
                <input
                  type="text"
                  value={editingProduct.name}
                  onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-pink-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Harga Jual (Rp):</label>
                  <input
                    type="number"
                    value={editingProduct.price}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, price: parseInt(e.target.value) || 0 })
                    }
                    className="w-full px-3.5 py-2 rounded-xl border border-pink-200 font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Stok Fisik:</label>
                  <input
                    type="number"
                    value={editingProduct.stock}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, stock: parseInt(e.target.value) || 0 })
                    }
                    className="w-full px-3.5 py-2 rounded-xl border border-pink-200 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">URL Foto Asli:</label>
                <input
                  type="text"
                  value={editingProduct.imageUrl}
                  onChange={(e) =>
                    setEditingProduct({ ...editingProduct, imageUrl: e.target.value })
                  }
                  className="w-full px-3.5 py-2 rounded-xl border border-pink-200"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Deskripsi:</label>
                <textarea
                  rows={2}
                  value={editingProduct.description}
                  onChange={(e) =>
                    setEditingProduct({ ...editingProduct, description: e.target.value })
                  }
                  className="w-full px-3.5 py-2 rounded-xl border border-pink-200"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="px-4 py-2 rounded-xl text-gray-600 hover:bg-gray-100 font-bold"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await updateProductDetails(editingProduct.id, {
                      name: editingProduct.name,
                      price: editingProduct.price,
                      stock: editingProduct.stock,
                      imageUrl: editingProduct.imageUrl,
                      description: editingProduct.description,
                    });
                    setEditingProduct(null);
                    alert('Perubahan produk berhasil disimpan!');
                  }}
                  className="px-5 py-2 rounded-xl bg-[#be185d] text-white font-bold cursor-pointer"
                >
                  Simpan Perubahan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: ADD PRODUCT ================= */}
      {isNewProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-pink-100 p-6 sm:p-8 space-y-4">
            <button
              onClick={() => setIsNewProductModalOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-full text-gray-400 hover:text-gray-700 hover:bg-pink-50 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-heading font-bold text-lg text-gray-900">
              Tambah Sepatu Flatshoes Baru
            </h3>

            <form onSubmit={handleCreateProduct} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Nama Sepatu:</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Daisy Pastel Ballerina"
                  value={newProdName}
                  onChange={(e) => setNewProdName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-pink-200 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Kategori:</label>
                  <select
                    value={newProdCategory}
                    onChange={(e) => setNewProdCategory(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-pink-200 bg-white"
                  >
                    <option value="Flat Shoes Klasik">Flat Shoes Klasik</option>
                    <option value="Pointed Elegant">Pointed Elegant</option>
                    <option value="Loafers & Slip-on">Loafers & Slip-on</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Warna:</label>
                  <input
                    type="text"
                    value={newProdColor}
                    onChange={(e) => setNewProdColor(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-pink-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">HPP Modal (Rp):</label>
                  <input
                    type="number"
                    value={newProdCostPrice}
                    onChange={(e) => setNewProdCostPrice(parseInt(e.target.value) || 0)}
                    className="w-full px-3.5 py-2 rounded-xl border border-pink-200 font-bold"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Harga Jual (Rp):</label>
                  <input
                    type="number"
                    value={newProdPrice}
                    onChange={(e) => setNewProdPrice(parseInt(e.target.value) || 0)}
                    className="w-full px-3.5 py-2 rounded-xl border border-pink-200 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Stok Awal:</label>
                <input
                  type="number"
                  value={newProdStock}
                  onChange={(e) => setNewProdStock(parseInt(e.target.value) || 0)}
                  className="w-full px-3.5 py-2 rounded-xl border border-pink-200 font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">URL Foto Flatshoes:</label>
                <input
                  type="text"
                  value={newProdImage}
                  onChange={(e) => setNewProdImage(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-pink-200"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Deskripsi:</label>
                <textarea
                  rows={2}
                  value={newProdDesc}
                  onChange={(e) => setNewProdDesc(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-pink-200"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewProductModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-gray-600 hover:bg-gray-100 font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#d65b7d] to-[#be185d] text-white font-bold shadow-xs hover:brightness-105"
                >
                  Tambah ke Katalog
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
