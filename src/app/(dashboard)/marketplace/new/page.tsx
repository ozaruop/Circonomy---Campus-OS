'use client'
// @ts-nocheck

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Upload, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { motion } from 'framer-motion'

const categories = ['Books', 'Electronics', 'Clothes', 'Sports', 'Other']
const conditions = ['New', 'Like New', 'Good', 'Fair']

const suggestedPrices: Record<string, number> = {
  Books: 350,
  Electronics: 5000,
  Clothes: 400,
  Sports: 800,
  Other: 500,
}

const label = {
  display: 'block',
  fontSize: '13px',
  fontWeight: 600,
  color: 'var(--on-surface)',
  marginBottom: '8px',
  fontFamily: 'var(--font-manrope)',
}

const inputStyle = {
  width: '100%',
  padding: '12px 16px',
  borderRadius: '12px',
  border: '1px solid var(--border)',
  backgroundColor: 'var(--surface-container-low)',
  color: 'var(--on-surface)',
  fontSize: '14px',
  outline: 'none',
  fontFamily: 'var(--font-inter)',
  transition: 'border-color 0.2s, box-shadow 0.2s',
}

export default function NewListingPage() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [category, setCategory] = useState('')
  const [condition, setCondition] = useState('')
  const [loading, setLoading] = useState(false)

  const suggested = category ? suggestedPrices[category] : null

  const handleSubmit = async () => {
    if (!title || !price || !category || !condition) {
      alert('Please fill in all required fields')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, price, category, condition }),
      })
      if (res.ok) {
        router.push('/marketplace')
      } else {
        const err = await res.json()
        alert(err.error ?? 'Something went wrong')
      }
    } catch {
      alert('Network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto' }}>
      {/* Back */}
      <Link
        href="/marketplace"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '8px',
          fontSize: '13px', color: 'var(--on-surface-variant)',
          textDecoration: 'none', marginBottom: '24px',
          transition: 'color 0.2s',
        }}
      >
        <ArrowLeft size={16} />
        Back to Marketplace
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          backgroundColor: 'var(--card)',
          borderRadius: '24px',
          padding: '36px',
          boxShadow: 'var(--shadow)',
          border: '1px solid var(--border)',
        }}
      >
        <h1 style={{
          fontSize: '26px', fontWeight: 800, color: 'var(--on-surface)',
          fontFamily: 'var(--font-manrope)', marginBottom: '4px',
        }}>
          Create Listing
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--on-surface-variant)', marginBottom: '32px' }}>
          Turn your unused items into campus currency.
        </p>

        {/* Image Upload */}
        <div style={{
          border: '2px dashed var(--outline-variant)',
          borderRadius: '20px',
          padding: '40px',
          textAlign: 'center',
          marginBottom: '24px',
          cursor: 'pointer',
          transition: 'all 0.2s',
          backgroundColor: 'var(--surface-container-low)',
        }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.backgroundColor = 'var(--primary-light)' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--outline-variant)'; e.currentTarget.style.backgroundColor = 'var(--surface-container-low)' }}
        >
          <div style={{
            width: '48px', height: '48px', borderRadius: '14px',
            backgroundColor: 'var(--surface-container)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 12px',
          }}>
            <Upload size={22} style={{ color: 'var(--outline)' }} />
          </div>
          <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--on-surface)' }}>Upload visual assets</p>
          <p style={{ fontSize: '12px', color: 'var(--on-surface-variant)', marginTop: '4px' }}>
            Drag and drop, or click to browse (Max 5MB)
          </p>
        </div>

        {/* Title */}
        <div style={{ marginBottom: '20px' }}>
          <label style={label}>
            Listing Title <span style={{ color: 'var(--error)' }}>*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. MacBook Air M1, Calculus Textbook..."
            style={inputStyle}
          />
        </div>

        {/* Description */}
        <div style={{ marginBottom: '20px' }}>
          <label style={label}>Tell us about this item</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe condition, included accessories, reason for selling..."
            rows={4}
            style={{ ...inputStyle, resize: 'none', lineHeight: 1.6 }}
          />
        </div>

        {/* Price + Category */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
          <div>
            <label style={label}>
              Price (₹) <span style={{ color: 'var(--error)' }}>*</span>
            </label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0"
              style={inputStyle}
            />
            {suggested && (
              <button
                onClick={() => setPrice(suggested.toString())}
                style={{
                  marginTop: '8px',
                  display: 'flex', alignItems: 'center', gap: '6px',
                  fontSize: '12px', fontWeight: 600,
                  padding: '6px 12px', borderRadius: '999px',
                  backgroundColor: 'var(--primary-light)', color: 'var(--primary)',
                  border: 'none', cursor: 'pointer',
                }}
              >
                <Sparkles size={12} />
                Suggested: ₹{suggested.toLocaleString()}
              </button>
            )}
          </div>

          <div>
            <label style={label}>
              Category <span style={{ color: 'var(--error)' }}>*</span>
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={{ ...inputStyle, cursor: 'pointer' }}
            >
              <option value="">Select category</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Condition */}
        <div style={{ marginBottom: '32px' }}>
          <label style={label}>
            Item Condition <span style={{ color: 'var(--error)' }}>*</span>
          </label>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {conditions.map((c) => (
              <button
                key={c}
                onClick={() => setCondition(c)}
                style={{
                  padding: '10px 20px', borderRadius: '12px',
                  fontSize: '13px', fontWeight: 600,
                  border: '2px solid',
                  cursor: 'pointer', transition: 'all 0.2s',
                  ...(condition === c
                    ? { borderColor: 'var(--primary)', backgroundColor: 'var(--primary-light)', color: 'var(--primary)' }
                    : { borderColor: 'var(--border)', backgroundColor: 'var(--surface-container-low)', color: 'var(--on-surface-variant)' }
                  ),
                }}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="signature-gradient"
          style={{
            width: '100%', padding: '16px', borderRadius: '14px',
            color: 'white', fontWeight: 700, fontSize: '15px',
            border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1, transition: 'opacity 0.2s',
            fontFamily: 'var(--font-manrope)',
            boxShadow: '0 8px 25px rgba(53, 37, 205, 0.3)',
          }}
        >
          {loading ? 'Posting...' : 'Post Listing →'}
        </button>

        <p style={{ textAlign: 'center', fontSize: '11px', color: 'var(--outline)', marginTop: '16px' }}>
          By posting, you agree to our Campus Marketplace guidelines.
        </p>
      </motion.div>
    </div>
  )
}