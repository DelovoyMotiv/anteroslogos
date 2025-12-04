# AIDProtocolView Component

## Overview

The `AIDProtocolView` component displays comprehensive AID (Agent Identity & Discovery) Protocol information for audited websites. It provides technical details about agent discovery, protocols, capabilities, endpoints, and debugging information.

## Features

### 1. Detection Status Overview
- **Detection indicator**: Shows whether AID protocol was detected
- **Discovery method**: DNS, HTTPS, Both, or None
- **Protocol version**: AID protocol version (e.g., 1.1)
- **Score**: Overall AID score (0-100)
- **Detection quality**: Excellent, Good, Fair, or Poor

### 2. Protocol Support
- **Protocol badges**: Visual display of supported protocols (A2A, HTTP, gRPC, MCP, GraphQL)
- **Protocol descriptions**: Detailed explanation of each protocol
- **Count indicator**: Number of supported protocols

### 3. Endpoint Information
- **Endpoint URL**: Agent API endpoint with copy functionality
- **Service ID**: Unique service identifier
- **Agent name**: Human-readable agent name
- **Agent description**: Detailed description of agent capabilities
- **Agent version**: Version of the agent implementation
- **Domain**: Associated domain

### 4. Capabilities
- **Capability badges**: Visual display of agent capabilities
- **Count indicator**: Number of capabilities
- **Categorization**: Grouped by capability type

### 5. Registry & Verification
- **Registry status**: Whether agent is registered in AID registry
- **Verification status**: Whether agent ownership is verified
- **Tenant ID**: Associated tenant identifier
- **Federation status**: Whether cross-tenant federation is allowed

### 6. Additional Information
- **Vendor**: Agent vendor/provider
- **Homepage**: Link to agent homepage
- **Documentation**: Link to API documentation
- **Contact**: Contact information

### 7. Metadata
- **Organization**: Organization name
- **Industry**: Industry classification
- **Established**: Establishment date
- **Specialization**: Areas of specialization

### 8. Pricing Information
- **Pricing tiers**: Free, Basic, Pro tiers
- **Rate limits**: Requests per minute/hour
- **Monthly pricing**: Cost per tier

### 9. Errors & Warnings
- **Error display**: Red-coded error messages
- **Warning display**: Yellow-coded warning messages
- **Count indicators**: Number of errors/warnings

### 10. Technical Debugging
- **Debug fields**: Key-value pairs of technical information
- **Detection details**: Method, version, protocols
- **Registry details**: Registration and verification status
- **Error counts**: Number of errors and warnings

## Usage

```tsx
import { AIDProtocolView } from './tabs/AIDProtocolView';

<AIDProtocolView result={auditResult} />
```

## Props

### `result: AuditResult`
Complete audit result object containing AID agent information.

**Required fields:**
- `result.details.aidAgent`: AID agent information
- `result.scores.aidAgent`: AID score (0-100)

## Component Structure

```
AIDProtocolView
├── Detection Status Overview
│   ├── Detection indicator
│   ├── Discovery method
│   ├── Protocol version
│   ├── Score
│   └── Detection quality
├── Protocol Support
│   ├── Protocol badges
│   └── Protocol descriptions
├── Endpoint Information
│   ├── Endpoint URL
│   ├── Service ID
│   ├── Agent name
│   ├── Agent description
│   ├── Agent version
│   └── Domain
├── Capabilities
│   └── Capability badges
├── Registry & Verification
│   ├── Registry status
│   ├── Verification status
│   ├── Tenant ID
│   └── Federation status
├── Additional Information
│   ├── Vendor
│   ├── Homepage
│   ├── Documentation
│   └── Contact
├── Metadata
│   ├── Organization
│   ├── Industry
│   ├── Established
│   └── Specialization
├── Pricing Information
│   └── Pricing tiers
├── Errors
│   └── Error messages
├── Warnings
│   └── Warning messages
└── Technical Debugging
    └── Debug fields
```

## Color Coding

### Detection Status
- **Emerald**: Detected
- **Red**: Not detected

### Discovery Method
- **Emerald**: Both (DNS + HTTPS)
- **Blue**: DNS only
- **Yellow**: HTTPS only
- **Slate**: None

### Score
- **Emerald**: ≥80 (Excellent)
- **Yellow**: 60-79 (Good)
- **Orange**: 40-59 (Fair)
- **Red**: <40 (Poor)

### Detection Quality
- **Emerald**: Excellent (Both methods, no errors/warnings)
- **Blue**: Good (Both methods, no errors)
- **Yellow**: Fair (Single method, no errors)
- **Orange**: Poor (Errors present)

## Sub-Components

### StatCard
Displays a labeled statistic with icon and color coding.

**Props:**
- `label: string` - Stat label
- `value: string | number` - Stat value
- `color: string` - Color theme
- `icon?: ReactNode` - Optional icon
- `isText?: boolean` - Text vs numeric display

### InfoField
Displays a labeled information field with optional copy and link functionality.

**Props:**
- `label: string` - Field label
- `value: string` - Field value
- `icon?: ReactNode` - Optional icon
- `copyable?: boolean` - Enable copy to clipboard
- `isLink?: boolean` - Render as clickable link

### DebugField
Displays a debug field in key-value format.

**Props:**
- `label: string` - Field label
- `value: string` - Field value

## Helper Functions

### `getScoreColor(score: number)`
Returns color based on score value.

**Returns:** `'emerald' | 'yellow' | 'orange' | 'red'`

### `getMethodColor(method: string)`
Returns color based on discovery method.

**Returns:** `'emerald' | 'blue' | 'yellow' | 'slate'`

### `getDetectionQuality(aid: AIDAgentInfo)`
Calculates detection quality based on method, errors, and warnings.

**Returns:** `'excellent' | 'good' | 'fair' | 'poor'`

### `getProtocolDescription(protocol: string)`
Returns human-readable description of protocol.

**Returns:** `string`

## Styling

### Theme
- **Background**: Black with transparency
- **Borders**: Slate with transparency
- **Text**: Slate/Blue/Emerald/Red/Yellow based on context
- **Font**: Monospace for technical data

### Layout
- **Spacing**: 4-unit gap between sections
- **Padding**: 4-unit padding in containers
- **Borders**: Rounded corners with subtle borders
- **Grid**: Responsive grid layouts (2-4 columns)

## Accessibility

- **Semantic HTML**: Proper heading hierarchy
- **ARIA labels**: Descriptive labels for interactive elements
- **Keyboard navigation**: All interactive elements keyboard accessible
- **Color contrast**: WCAG 2.1 AA compliant
- **Focus indicators**: Visible focus states

## Performance

- **Conditional rendering**: Only renders sections with data
- **Memoization**: Consider React.memo for large datasets
- **Lazy loading**: Component can be lazy loaded
- **Optimized icons**: Lucide React icons are tree-shakeable

## Integration

### With TechnicalTab
```tsx
import { AIDProtocolView } from './AIDProtocolView';

{activeSubTab === 'aid-protocol' && (
  <AIDProtocolView result={result} />
)}
```

### With AuditPage
```tsx
// Via TechnicalTab sub-navigation
<TechnicalTab result={result} />
```

## Data Requirements

### Minimum Required
```typescript
{
  details: {
    aidAgent: {
      detected: boolean,
      discoveryMethod: 'dns' | 'https' | 'both' | 'none',
      errors: string[],
      warnings: string[]
    }
  },
  scores: {
    aidAgent: number
  }
}
```

### Full Data Structure
```typescript
{
  details: {
    aidAgent: {
      detected: boolean,
      discoveryMethod: 'dns' | 'https' | 'both' | 'none',
      version?: string,
      protocols?: string[],
      endpoint?: string,
      serviceId?: string,
      domain?: string,
      agentName?: string,
      agentDescription?: string,
      agentVersion?: string,
      capabilities?: string[],
      vendor?: string,
      homepage?: string,
      documentation?: string,
      contact?: string,
      metadata?: {
        organization?: string,
        industry?: string,
        established?: string,
        specialization?: string[]
      },
      pricing?: Record<string, unknown>,
      tenantId?: string,
      verified?: boolean,
      registeredInRegistry?: boolean,
      federationAllowed?: boolean,
      errors: string[],
      warnings: string[]
    }
  },
  scores: {
    aidAgent: number
  }
}
```

## Testing

### Unit Tests
```typescript
describe('AIDProtocolView', () => {
  it('renders detection status', () => {
    // Test detection indicator
  });

  it('displays protocols', () => {
    // Test protocol badges
  });

  it('shows endpoint information', () => {
    // Test endpoint display
  });

  it('handles missing data gracefully', () => {
    // Test with minimal data
  });
});
```

### Integration Tests
```typescript
describe('AIDProtocolView Integration', () => {
  it('integrates with TechnicalTab', () => {
    // Test sub-tab navigation
  });

  it('displays real audit data', () => {
    // Test with actual audit result
  });
});
```

## Future Enhancements

1. **Visual Graph**: Network diagram of agent relationships
2. **Protocol Testing**: Live protocol endpoint testing
3. **Registry Lookup**: Direct registry search functionality
4. **Export**: Export AID data as JSON/YAML
5. **Comparison**: Compare AID implementations across audits
6. **Validation**: Real-time AID configuration validation
7. **Recommendations**: Inline improvement suggestions

## Related Components

- `TechnicalTab`: Parent component with sub-tab navigation
- `RawDataView`: Raw JSON data display
- `KnowledgeGraphView`: Knowledge graph visualization
- `SchemaValidationView`: Schema validation details

## References

- [AID Protocol Specification](../../../../../../docs/agent-gateway.md)
- [AID Discovery Implementation](../../../../../../utils/aidDiscovery.ts)
- [AID Registry](../../../../../../lib/tenancy/aidRegistry.ts)

---

**Component Status**: ✅ Complete  
**Last Updated**: December 4, 2025  
**Version**: 1.0.0
