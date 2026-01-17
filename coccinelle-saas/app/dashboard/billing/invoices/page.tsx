'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Download, Eye, Calendar, Loader2, AlertCircle } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';

interface Invoice {
  invoice_id: string;
  invoice_number: string;
  status: string;
  subtotal_cents: number;
  tax_cents: number;
  total_cents: number;
  due_date: string;
  paid_at: string | null;
  created_at: string;
  line_items?: InvoiceLineItem[];
}

interface InvoiceLineItem {
  description: string;
  quantity: number;
  unit_price_cents: number;
  total_cents: number;
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInvoices();
  }, []);

  const loadInvoices = async () => {
    setLoading(true);
    try {
      // TODO: Remplacer par le vrai tenantId de l'utilisateur connecté
      const tenantId = 'tenant_123';
      const res = await fetch(`${API_URL}/api/v1/billing/invoices?tenantId=${tenantId}`);
      const data = await res.json();

      if (data.success) {
        setInvoices(data.invoices || []);
      }
    } catch (error) {
      console.error('Error loading invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadInvoiceDetails = async (invoiceId: string) => {
    try {
      const res = await fetch(`${API_URL}/api/v1/billing/invoices/${invoiceId}`);
      const data = await res.json();

      if (data.success) {
        setSelectedInvoice(data.invoice);
      }
    } catch (error) {
      console.error('Error loading invoice details:', error);
    }
  };

  const downloadInvoice = async (invoiceId: string) => {
    try {
      const res = await fetch(`${API_URL}/api/v1/billing/invoices/${invoiceId}/download`);
      const blob = await res.blob();

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `facture-${invoiceId}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading invoice:', error);
      alert('Erreur lors du téléchargement de la facture');
    }
  };

  const formatPrice = (cents: number) => {
    return (cents / 100).toFixed(2);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge variant="default" className="bg-green-500">Payée</Badge>;
      case 'pending':
        return <Badge variant="secondary">En attente</Badge>;
      case 'overdue':
        return <Badge variant="destructive">En retard</Badge>;
      case 'draft':
        return <Badge variant="outline">Brouillon</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* En-tête */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Historique des factures</h1>
          <p className="text-gray-600">
            Consultez et téléchargez toutes vos factures
          </p>
        </div>

        {/* Liste des factures */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Colonne gauche - Liste */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Factures</CardTitle>
                <CardDescription>
                  {invoices.length} facture{invoices.length > 1 ? 's' : ''}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {invoices.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-500">Aucune facture disponible</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {invoices.map((invoice) => (
                      <div
                        key={invoice.invoice_id}
                        className={`p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors ${
                          selectedInvoice?.invoice_id === invoice.invoice_id ? 'border-primary bg-blue-50' : ''
                        }`}
                        onClick={() => loadInvoiceDetails(invoice.invoice_id)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <FileText className="h-4 w-4 text-gray-500" />
                              <span className="font-medium">{invoice.invoice_number}</span>
                              {getStatusBadge(invoice.status)}
                            </div>
                            <div className="text-sm text-gray-500">
                              <div className="flex items-center gap-2 mt-1">
                                <Calendar className="h-3 w-3" />
                                Émise le {formatDate(invoice.created_at)}
                              </div>
                              {invoice.paid_at && (
                                <div className="text-green-600 text-xs mt-1">
                                  Payée le {formatDate(invoice.paid_at)}
                                </div>
                              )}
                              {!invoice.paid_at && invoice.due_date && (
                                <div className="text-orange-600 text-xs mt-1">
                                  Échéance : {formatDate(invoice.due_date)}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-lg">
                              {formatPrice(invoice.total_cents)}€
                            </div>
                            <div className="flex gap-1 mt-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  loadInvoiceDetails(invoice.invoice_id);
                                }}
                              >
                                <Eye className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  downloadInvoice(invoice.invoice_id);
                                }}
                              >
                                <Download className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Colonne droite - Détails */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle>Détails de la facture</CardTitle>
              </CardHeader>
              <CardContent>
                {!selectedInvoice ? (
                  <div className="text-center py-8">
                    <AlertCircle className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                    <p className="text-sm text-gray-500">
                      Sélectionnez une facture pour voir les détails
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <div className="text-sm text-gray-500 mb-1">Numéro</div>
                      <div className="font-medium">{selectedInvoice.invoice_number}</div>
                    </div>

                    <div>
                      <div className="text-sm text-gray-500 mb-1">Statut</div>
                      {getStatusBadge(selectedInvoice.status)}
                    </div>

                    <div>
                      <div className="text-sm text-gray-500 mb-1">Date d'émission</div>
                      <div>{formatDate(selectedInvoice.created_at)}</div>
                    </div>

                    {selectedInvoice.due_date && (
                      <div>
                        <div className="text-sm text-gray-500 mb-1">Date d'échéance</div>
                        <div>{formatDate(selectedInvoice.due_date)}</div>
                      </div>
                    )}

                    {selectedInvoice.paid_at && (
                      <div>
                        <div className="text-sm text-gray-500 mb-1">Date de paiement</div>
                        <div className="text-green-600">{formatDate(selectedInvoice.paid_at)}</div>
                      </div>
                    )}

                    <div className="border-t pt-4">
                      <div className="text-sm font-medium mb-2">Détail</div>
                      {selectedInvoice.line_items && selectedInvoice.line_items.length > 0 ? (
                        <div className="space-y-2">
                          {selectedInvoice.line_items.map((item, idx) => (
                            <div key={idx} className="text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-600">{item.description}</span>
                                <span>{formatPrice(item.total_cents)}€</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-sm text-gray-500">Aucun détail disponible</div>
                      )}
                    </div>

                    <div className="border-t pt-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Sous-total</span>
                        <span>{formatPrice(selectedInvoice.subtotal_cents)}€</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">TVA (20%)</span>
                        <span>{formatPrice(selectedInvoice.tax_cents)}€</span>
                      </div>
                      <div className="flex justify-between font-bold text-lg border-t pt-2">
                        <span>Total</span>
                        <span>{formatPrice(selectedInvoice.total_cents)}€</span>
                      </div>
                    </div>

                    <Button
                      className="w-full"
                      onClick={() => downloadInvoice(selectedInvoice.invoice_id)}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Télécharger PDF
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Note */}
        <div className="mt-6 text-sm text-gray-500 text-center">
          <p>Toutes les factures sont conservées pendant 10 ans conformément à la réglementation</p>
        </div>
      </div>
    </div>
  );
}
