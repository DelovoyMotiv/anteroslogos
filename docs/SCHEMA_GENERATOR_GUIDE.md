# AI Schema Generator - User Guide

## Overview

The AI Schema Generator uses OpenRouter API with the **z-ai/glm-4.5-air:free** model to automatically generate production-ready Schema.org markup optimized for AI system visibility.

## Features

- ✅ **8 Content Types Supported**: Article, Product, Service, Organization, Person, FAQ, HowTo, Event
- ✅ **AI-Powered Generation**: Uses GEO Marketolog Agent for expert-level schemas
- ✅ **Production-Ready Output**: Fully validated JSON-LD markup
- ✅ **Knowledge Graph Integration**: Automatic entity connections
- ✅ **Impact Estimation**: Predicts GEO score increase and citation probability
- ✅ **One-Click Copy/Download**: Easy implementation

## How to Use

### 1. Navigate to AI Schema Generator

From GEO Audit results page, click on the **"AI Schema Generator"** tab in the AAA-Level Features section.

### 2. Choose Your Workflow

#### Option A: Analyze Existing Schemas (Recommendations Tab)

1. Click the **"Recommendations"** tab
2. Click **"Analyze Your Schemas"** button
3. AI will scan your current schemas and provide:
   - Missing critical schema types
   - Improvements for existing schemas
   - Advanced features (@graph, knowledge connections)
   - AI-specific enhancements
4. Each recommendation includes:
   - Priority level (Critical/High/Medium/Low)
   - Implementation guide
   - Estimated time
   - Code examples

#### Option B: Generate New Schema (Generate Tab)

1. Click the **"Generate Schema"** tab
2. Select your content type:
   - **Article**: Blog posts, news articles, guides
   - **Product**: E-commerce products, SaaS tools
   - **Service**: Professional services, offerings
   - **Organization**: Company, agency information
   - **Person**: Author profiles, team members
   - **FAQ**: Frequently asked questions
   - **HowTo**: Step-by-step tutorials
   - **Event**: Webinars, conferences, workshops

3. Click **"Generate [Type] Schema"**
4. AI generates optimized Schema.org markup with:
   - Complete JSON-LD structure
   - AI-optimized properties
   - Knowledge graph connections
   - E-E-A-T signals

### 3. Review Generated Schema

The AI provides:

#### Validation Status
- ✅ **Valid Schema**: Passes all validation checks
- ⚠️ **Schema Generated**: May need minor adjustments

#### Impact Metrics
- **GEO Score**: Expected increase (+5 to +15 points)
- **Citation Probability**: Increase percentage (+10% to +30%)
- **Visibility**: Low/Medium/High/Very High

#### AI Insights
- Schema benefits for AI systems
- Citation likelihood improvements
- Entity recognition enhancements
- Knowledge graph connections

### 4. Implement Schema

#### Copy to Clipboard
1. Click the **"Copy"** button
2. Paste into your HTML `<head>` section

#### Download JSON
1. Click the **"Download"** button
2. Save as `.json` file
3. Integrate into your CMS or build system

#### Example Implementation

```html
<!DOCTYPE html>
<html>
<head>
  <!-- Your existing meta tags -->
  
  <!-- AI-Generated Schema.org Markup -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "Your Article Title",
    "author": {
      "@type": "Person",
      "name": "Author Name"
    },
    "datePublished": "2025-11-04",
    "publisher": {
      "@type": "Organization",
      "name": "Your Organization"
    }
  }
  </script>
</head>
<body>
  <!-- Your content -->
</body>
</html>
```

## Content Type Guide

### Article Schema
**Best for**: Blog posts, news articles, knowledge base content

**Key Properties**:
- Headline, author, datePublished
- Publisher organization
- Article body/description
- Images, videos

**AI Impact**: High - Articles are primary citation sources

---

### Product Schema
**Best for**: E-commerce products, SaaS tools, physical goods

**Key Properties**:
- Name, description, brand
- Price, availability
- Reviews, ratings
- Images

**AI Impact**: Medium-High - Products appear in AI shopping recommendations

---

### Organization Schema
**Best for**: Company pages, agency profiles, business information

**Key Properties**:
- Name, URL, logo
- Social profiles (sameAs)
- Contact information
- Founder, employees

**AI Impact**: Critical - Foundation for brand identity in AI

---

### Person Schema
**Best for**: Author pages, team member profiles, expert bios

**Key Properties**:
- Name, jobTitle, worksFor
- Credentials, expertise
- Social profiles
- Publications

**AI Impact**: High - Establishes E-E-A-T authority

---

### FAQ Schema
**Best for**: FAQ pages, help centers, knowledge bases

**Key Properties**:
- Question and accepted answer pairs
- Multiple Q&A entries
- Rich text answers

**AI Impact**: Very High - Frequently cited by AI for direct answers

---

### HowTo Schema
**Best for**: Tutorials, guides, step-by-step instructions

**Key Properties**:
- Name, description
- Step-by-step instructions
- Tools, materials needed
- Duration

**AI Impact**: Very High - AI systems cite procedural content

---

### Service Schema
**Best for**: Professional services, offerings, capabilities

**Key Properties**:
- Service type, description
- Provider organization
- Areas served
- Offers

**AI Impact**: Medium - Helps AI match services to queries

---

### Event Schema
**Best for**: Webinars, conferences, workshops, meetups

**Key Properties**:
- Name, startDate, endDate
- Location (physical or virtual)
- Organizer, performers
- Tickets, offers

**AI Impact**: Medium - Event recommendations and listings

## Best Practices

### 1. Use Multiple Schema Types
- Combine Organization + Person + Article for maximum impact
- Use @graph structure to connect entities

### 2. Keep Schemas Updated
- Regenerate when content changes significantly
- Update dates, prices, availability
- Add new knowledge graph connections

### 3. Validate Before Deployment
- Use Google Rich Results Test
- Check Schema.org validator
- Test in multiple browsers

### 4. Monitor Performance
- Track GEO score changes
- Monitor citation frequency
- Measure AI system visibility

## Technical Details

### API Configuration

**Model**: `z-ai/glm-4.5-air:free`
- Free tier (no costs)
- Excellent quality
- Multilingual support
- Fast response times

**Rate Limits**: OpenRouter free tier limits apply
- Reasonable usage for production
- Consider paid plan for high-volume

### Schema Validation

All generated schemas are automatically validated for:
- ✅ Correct @context and @type
- ✅ Required properties present
- ✅ Valid property values
- ✅ Proper JSON-LD structure

### Knowledge Graph Connections

AI automatically adds:
- `sameAs`: Links to authoritative sources
- `about`: Topic/subject connections
- `author`/`publisher`: Entity relationships
- `relatedTo`: Content associations

## Troubleshooting

### "Failed to generate schema"
**Cause**: API key not configured or invalid

**Solution**:
1. Verify `VITE_OPENROUTER_API_KEY` is set
2. Check API key is valid at OpenRouter
3. Ensure model name includes `:free` suffix

### Schema validation warnings
**Cause**: Optional properties missing

**Solution**:
- Warnings are normal for optional fields
- Add properties manually if needed
- Re-generate with more context

### Slow generation
**Cause**: API rate limiting or server load

**Solution**:
- Wait 30 seconds between requests
- Retry generation
- Check OpenRouter status

## FAQ

### Q: Is the Schema Generator free?
**A**: Yes! Uses `z-ai/glm-4.5-air:free` model at no cost.

### Q: How accurate are the impact estimates?
**A**: Based on GEO research and industry data. Actual results vary by implementation quality and existing site optimization.

### Q: Can I edit generated schemas?
**A**: Absolutely! Copy the JSON-LD and customize as needed. Always validate after editing.

### Q: Which content type should I use?
**A**: Match your page content:
- Blog post → Article
- Product page → Product
- Company info → Organization
- Tutorial → HowTo

### Q: How often should I regenerate schemas?
**A**: When content changes significantly or quarterly to incorporate new AI optimization best practices.

## Support

For issues or questions:
- Email: support@anoteroslogos.com
- Enterprise support: enterprise@anoteroslogos.com

---

**Last Updated**: November 4, 2025
**Version**: 1.0.0
