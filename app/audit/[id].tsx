import { router, useLocalSearchParams } from 'expo-router'
import React, { useEffect, useState } from 'react'
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    View
} from 'react-native'
import BackButton from '../../components/BackButton'
import Card from '../../components/Card'
import ListItem from '../../components/ListItem'
import Screen from '../../components/Screen'
import StatusBadge from '../../components/StatusBadge'
import { supabase } from '../../lib/supabase'

interface FormRecord {
    id: number
    form_schema: { title: string; [key: string]: any }
    status: string
}

const AuditDetail = () => {
    const { id } = useLocalSearchParams<{ id: string }>()
    const [forms, setForms] = useState<FormRecord[]>([])
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)

    const fetchForms = async () => {
        if (!id) return
        
        try {
            const { data, error } = await supabase
                .from('form')
                .select('id, form_schema, status')
                .eq('compliance_id', id)

            if (!error && data) {
                setForms(data as FormRecord[])
            }
        } catch (error) {
            console.error('Error fetching forms:', error)
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }

    useEffect(() => {
        fetchForms()
    }, [id])

    const onRefresh = () => {
        setRefreshing(true)
        fetchForms()
    }

    const renderFormItem = ({ item }: { item: FormRecord }) => (
        <ListItem
            title={item.form_schema.title}
            subtitle={`Form ID: ${item.id}`}
            rightElement={<StatusBadge status={item.status} />}
            leftIcon="description"
            onPress={() =>
                router.push({
                    pathname: '/audit/form/[formId]',
                    params: { id, formId: item.id.toString() },
                })
            }
        />
    )

    const renderEmptyState = () => (
        <Card style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No Forms Available</Text>
            <Text style={styles.emptyDescription}>
                There are no forms available for this compliance record yet.
            </Text>
        </Card>
    )

    if (loading) {
        return (
            <Screen style={styles.container}>
                <BackButton 
                    onPress={() => router.push('/(tabs)/audit')}
                    title="Back to Compliance List"
                    style={styles.backButton}
                />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#3b82f6" />
                    <Text style={styles.loadingText}>Loading forms...</Text>
                </View>
            </Screen>
        )
    }

    return (
        <Screen style={styles.container}>
            <BackButton 
                onPress={() => router.push('/(tabs)/audit')}
                title="Back to Compliance List"
                style={styles.backButton}
            />
              <View style={styles.header}>
                <Text style={styles.title}>Compliance Forms</Text>
                <Text style={styles.subtitle}>Review and complete forms for compliance {id}</Text>
            </View>
            
            <FlatList
                data={forms}
                keyExtractor={(f) => f.id.toString()}
                renderItem={renderFormItem}
                ListEmptyComponent={renderEmptyState}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.listContainer}
            />
        </Screen>
    )
}

export default AuditDetail

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    backButton: {
        marginTop: 16,
        marginHorizontal: 16,
    },
    header: {
        paddingHorizontal: 24,
        paddingBottom: 16,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 16,
        color: '#6b7280',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: '#6b7280',
    },    listContainer: {
        paddingHorizontal: 16,
        paddingBottom: 120, // Account for redesigned tab bar
    },
    emptyCard: {
        margin: 16,
        alignItems: 'center',
        paddingVertical: 32,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 8,
    },
    emptyDescription: {
        fontSize: 16,
        color: '#6b7280',
        textAlign: 'center',
        lineHeight: 24,
    },
})
